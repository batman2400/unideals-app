import { Linking, Platform } from "react-native";

export interface PlaceText {
  name?: string | null;
  address?: string | null;
}

/** Human-readable one-liner, e.g. "Cargills Food City, 12 Galle Rd, Colombo". */
export function formatPlace({ name, address }: PlaceText): string {
  const parts = [name?.trim(), address?.trim()].filter(
    (part): part is string => Boolean(part),
  );
  // Don't repeat the name when the address already starts with it.
  if (
    parts.length === 2 &&
    parts[1]!.toLowerCase().startsWith(parts[0]!.toLowerCase())
  ) {
    return parts[1]!;
  }
  return parts.join(", ");
}

/** Maps search URL for the place, or null when there is nothing to search. */
export function buildMapsUrl(place: PlaceText): string | null {
  const query = formatPlace(place);
  if (!query) return null;
  const encoded = encodeURIComponent(query);
  if (Platform.OS === "ios") {
    return `https://maps.apple.com/?q=${encoded}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}

/** Opens the user's maps app on the place. Resolves false if it couldn't. */
export async function openInMaps(place: PlaceText): Promise<boolean> {
  const url = buildMapsUrl(place);
  if (!url) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

export const LOCATION_NAME_MAX = 120;
export const LOCATION_ADDRESS_MAX = 240;

/** Returns an error message when a required location is incomplete. */
export function validateLocation(
  place: PlaceText,
  options: {
    required: boolean;
    subject: string;
    /** Defaults to `required`. Events only need a name; stores need both. */
    requireAddress?: boolean;
  },
): string | null {
  const requireAddress = options.requireAddress ?? options.required;
  const name = place.name?.trim() ?? "";
  const address = place.address?.trim() ?? "";

  if (name.length > LOCATION_NAME_MAX) {
    return `${options.subject} name must be ${LOCATION_NAME_MAX} characters or fewer.`;
  }
  if (address.length > LOCATION_ADDRESS_MAX) {
    return `Address must be ${LOCATION_ADDRESS_MAX} characters or fewer.`;
  }
  if (options.required && !name) {
    return `${options.subject} name is required.`;
  }
  if (requireAddress && !address) {
    return "Address is required so students can find you in Maps.";
  }
  return null;
}
