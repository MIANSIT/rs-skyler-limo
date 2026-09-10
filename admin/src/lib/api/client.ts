import "server-only";

/**
 * The only place the Next.js server talks to the Express API.
 *
 * `API_URL` is a server-only variable on purpose — it is never prefixed with
 * `NEXT_PUBLIC_`. In production the API listens on localhost:4000 behind nginx
 * and is not routable from a browser, so every call is made here, server side,
 * and the browser only ever sees this app's own origin.
 */
const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:4000";

export type ApiFailure = {
  status: number;
  code: string;
  message: string;
  /** Field-level messages from the API's Zod layer, keyed by field name. */
  fields?: Record<string, string>;
};

export class ApiRequestError extends Error {
  readonly failure: ApiFailure;

  constructor(failure: ApiFailure) {
    super(failure.message);
    this.name = "ApiRequestError";
    this.failure = failure;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  /** Session token forwarded as a bearer credential for admin endpoints. */
  token?: string;
  /** Forwarded so the API's rate limiter sees the customer, not the server. */
  forwardedFor?: string;
  signal?: AbortSignal;
};

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers({ Accept: "application/json" });

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }
  if (options.forwardedFor) {
    headers.set("X-Forwarded-For", options.forwardedFor);
  }

  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      // Operational data. A cached dashboard is a wrong dashboard.
      cache: "no-store",
      signal: options.signal,
    });
  } catch {
    // A refused connection means the API is down — say so plainly rather than
    // rendering an empty dashboard that looks like "no bookings today".
    throw new ApiRequestError({
      status: 503,
      code: "api_unreachable",
      message: "Cannot reach the booking service.",
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (payload as { error?: Record<string, unknown> } | null)?.error;

    throw new ApiRequestError({
      status: response.status,
      code: typeof error?.code === "string" ? error.code : "unknown_error",
      message:
        typeof error?.message === "string"
          ? error.message
          : "Something went wrong.",
      fields:
        error?.fields && typeof error.fields === "object"
          ? (error.fields as Record<string, string>)
          : undefined,
    });
  }

  return payload as T;
}
