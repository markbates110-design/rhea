/**
 * One Google Places `address_components[]` entry — same shape returned by
 * both the JS Places SDK and the REST Place Details endpoint. We accept
 * either at runtime since the backfill script uses REST and the in-app
 * SpotSearch uses the SDK.
 */
export interface AddressComponentLike {
  long_name?: string;
  short_name?: string;
  types?: string[];
}

export interface StructuredAddress {
  city: string | null;
  neighborhood: string | null;
  state: string | null;
  postal_code: string | null;
}

/**
 * Pulls the four structured fields we store on `ratings` for SEO query
 * patterns out of Google's `address_components[]`. Every field is null
 * when Google doesn't return it — `neighborhood` is the most commonly
 * absent. We fall back to `sublocality` / `sublocality_level_1` for the
 * neighborhood slot since Google uses those interchangeably in some
 * metros (DFW included).
 *
 * State uses `short_name` ("TX") because SEO + UI both want the
 * abbreviation; everything else uses `long_name`.
 */
export function extractAddressComponents(
  components: readonly AddressComponentLike[] | undefined | null,
): StructuredAddress {
  const out: StructuredAddress = {
    city: null,
    neighborhood: null,
    state: null,
    postal_code: null,
  };
  if (!components || components.length === 0) return out;

  for (const c of components) {
    const types = c.types ?? [];
    if (out.city === null && types.includes("locality")) {
      out.city = c.long_name ?? null;
    }
    if (out.neighborhood === null && types.includes("neighborhood")) {
      out.neighborhood = c.long_name ?? null;
    }
    if (out.state === null && types.includes("administrative_area_level_1")) {
      out.state = c.short_name ?? null;
    }
    if (out.postal_code === null && types.includes("postal_code")) {
      out.postal_code = c.long_name ?? null;
    }
  }

  // Sublocality fallback: in many DFW addresses Google tags what residents
  // call a "neighborhood" as sublocality_level_1 (or just sublocality)
  // rather than the literal "neighborhood" type. Only fall through when the
  // explicit neighborhood slot didn't fill above.
  if (out.neighborhood === null) {
    for (const c of components) {
      const types = c.types ?? [];
      if (types.includes("sublocality") || types.includes("sublocality_level_1")) {
        out.neighborhood = c.long_name ?? null;
        break;
      }
    }
  }

  return out;
}
