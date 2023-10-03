export const VALID_EDUCATION_TYPES = ["college", "high school"] as const;

export type educationTypesType = (typeof VALID_EDUCATION_TYPES)[number];

export const VALID_ATTENDED_FOR = ["undergraduate", "graduate school"] as const;

export type attendedForType = (typeof VALID_ATTENDED_FOR)[number];
