import { env } from "../env.js";
import { ApiError } from "../lib/http.js";

/**
 * Google Places, proxied.
 *
 * The key never reaches a browser. Autocomplete fires on every keystroke, so a
 * browser key would be scraped within a day and billed to this account; routing
 * through the API means the key lives in one env file on one server, and the
 * rate limiter in front of these routes is ours to set.
 *
 * Everything degrades to `available: false` rather than throwing. Without a key
 * the booking form falls back to a plain address field and airport transfers
 * are quoted rather than fixed, which is a worse experience but a working one — a missing API key must never
 * be the reason a customer cannot book.
 */

const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const DETAILS_URL = "https://places.googleapis.com/v1/places";

export function placesAvailable(): boolean {
  return Boolean(env.GOOGLE_MAPS_API_KEY);
}

export type Suggestion = {
  placeId: string;
  /** "1 Rockefeller Plaza" */
  primary: string;
  /** "New York, NY, USA" */
  secondary: string;
};

export type ResolvedPlace = {
  placeId: string;
  formattedAddress: string;
  /** Borough where Google supplies one, otherwise the town or city. */
  locality: string | null;
  /** Two-letter state code: "NY", "NJ". */
  region: string | null;
  /** True only for the five boroughs of New York City. */
  isNewYorkCity: boolean;
};

/**
 * The five boroughs as Google labels them.
 *
 * Google returns `sublocality_level_1` as the borough ("Brooklyn", "Queens")
 * and `locality` as "New York" for Manhattan addresses — Manhattan itself is
 * usually only in `sublocality_level_1`. Both are checked.
 */
const NYC_BOROUGHS = new Set([
  "manhattan",
  "brooklyn",
  "queens",
  "the bronx",
  "bronx",
  "staten island",
  "new york",
]);

type AutocompleteResponse = {
  suggestions?: {
    placePrediction?: {
      placeId?: string;
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }[];
};

type AddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
};

type DetailsResponse = {
  id?: string;
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
};

async function callGoogle<T>(
  url: string,
  init: RequestInit & { fieldMask: string },
): Promise<T> {
  const { fieldMask, ...rest } = init;

  const response = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY!,
      "X-Goog-FieldMask": fieldMask,
      ...(rest.headers ?? {}),
    },
    // A slow Google must not hold a booking form open indefinitely.
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    // Logged in full for us; the caller gets nothing that names the provider or
    // leaks a quota message.
    console.error(`Places request failed ${response.status}: ${body.slice(0, 500)}`);
    throw new ApiError(
      502,
      "places_unavailable",
      "Address lookup is unavailable. Type the address and we will confirm it.",
    );
  }

  return (await response.json()) as T;
}

export async function autocomplete(
  input: string,
  sessionToken: string,
): Promise<Suggestion[]> {
  if (!placesAvailable()) return [];
  if (input.trim().length < 3) return [];

  const data = await callGoogle<AutocompleteResponse>(AUTOCOMPLETE_URL, {
    method: "POST",
    fieldMask:
      "suggestions.placePrediction.placeId,suggestions.placePrediction.structuredFormat",
    body: JSON.stringify({
      input,
      // Biased to the New York metro area rather than restricted to it: a
      // customer booking a run to Connecticut still needs to find their
      // address, they simply will not get a fixed fare.
      locationBias: {
        circle: {
          center: { latitude: 40.7128, longitude: -74.006 },
          // 50km is Google's hard ceiling — it rejects the whole request with
          // INVALID_ARGUMENT above it, which is how this went unnoticed until
          // an API key was finally configured and every lookup 400'd. From
          // Manhattan this still reaches Westchester, Newark and JFK; the bias
          // only ranks results, so an address outside it is still findable.
          radius: 50_000,
        },
      },
      includedRegionCodes: ["us"],
      // Billing is per session, not per keystroke, when the same token is
      // carried from the first keystroke through to the details call.
      sessionToken,
    }),
  });

  return (data.suggestions ?? [])
    .map((entry) => entry.placePrediction)
    .filter((prediction) => prediction?.placeId)
    .map((prediction) => ({
      placeId: prediction!.placeId!,
      primary: prediction!.structuredFormat?.mainText?.text ?? "",
      secondary: prediction!.structuredFormat?.secondaryText?.text ?? "",
    }));
}

/**
 * Places resolved recently, by place id.
 *
 * The booking form asks whether a chosen address is inside the city as soon as
 * it is picked, so the button can say "Book at this fare" or "Request a quote"
 * truthfully; `decideFare` asks again on submission. Remembering the answer
 * means the second question costs nothing — one details call per chosen
 * address, the same as before the form asked. An address does not change
 * borough, so a stale entry is not a risk; the bound only caps memory.
 */
const RESOLVED_TTL_MS = 60 * 60_000;
const RESOLVED_MAX = 1000;
const resolved = new Map<string, { place: ResolvedPlace; expires: number }>();

export async function resolvePlace(
  placeId: string,
  sessionToken: string,
): Promise<ResolvedPlace | null> {
  if (!placesAvailable()) return null;

  const cached = resolved.get(placeId);
  if (cached && cached.expires > Date.now()) return cached.place;

  const place = await fetchPlace(placeId, sessionToken);

  resolved.delete(placeId);
  if (resolved.size >= RESOLVED_MAX) {
    // Maps iterate in insertion order, so the first key is the oldest.
    resolved.delete(resolved.keys().next().value!);
  }
  resolved.set(placeId, { place, expires: Date.now() + RESOLVED_TTL_MS });

  return place;
}

async function fetchPlace(
  placeId: string,
  sessionToken: string,
): Promise<ResolvedPlace> {
  const data = await callGoogle<DetailsResponse>(
    `${DETAILS_URL}/${encodeURIComponent(placeId)}?sessionToken=${encodeURIComponent(sessionToken)}`,
    { method: "GET", fieldMask: "id,formattedAddress,addressComponents" },
  );

  const components = data.addressComponents ?? [];
  const find = (type: string) =>
    components.find((component) => component.types?.includes(type));

  const borough = find("sublocality_level_1") ?? find("sublocality");
  const locality = find("locality");
  const region = find("administrative_area_level_1");

  const localityName = borough?.longText ?? locality?.longText ?? null;
  const regionCode = region?.shortText ?? null;

  return {
    placeId: data.id ?? placeId,
    formattedAddress: data.formattedAddress ?? "",
    locality: localityName,
    region: regionCode,
    // Both halves matter: "New York" is also a town in several other states,
    // and a borough name alone could appear outside NY.
    isNewYorkCity:
      regionCode === "NY" &&
      Boolean(localityName) &&
      NYC_BOROUGHS.has(localityName!.trim().toLowerCase()),
  };
}
