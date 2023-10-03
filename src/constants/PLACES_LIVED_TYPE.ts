export const PLACES_LIVED_TYPE = ["current", "hometown", "default"] as const;

export type placesLivedType = (typeof PLACES_LIVED_TYPE)[number];
