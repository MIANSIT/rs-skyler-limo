/**
 * A failure the caller is allowed to see. Anything thrown that is not an
 * `ApiError` is treated as a bug and reported as a bare 500 — internal
 * messages never reach a customer.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, "bad_request", message, details);
  }

  static unauthorized(message = "Sign in to continue.") {
    return new ApiError(401, "unauthorized", message);
  }

  static forbidden(message = "You do not have access to that.") {
    return new ApiError(403, "forbidden", message);
  }

  static notFound(message = "Not found.") {
    return new ApiError(404, "not_found", message);
  }

  static conflict(message: string) {
    return new ApiError(409, "conflict", message);
  }

  static tooMany(message = "Too many attempts. Try again shortly.") {
    return new ApiError(429, "too_many_requests", message);
  }
}
