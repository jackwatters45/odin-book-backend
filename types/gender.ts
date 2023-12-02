export const DEFAULT_GENDER_TYPES = [
	"Male",
	"Female",
	"Nonbinary",
	"Other",
] as const;

export type GenderTypesType = (typeof DEFAULT_GENDER_TYPES)[number];

export interface IGender {
	defaultType: GenderTypesType;
	other: string | undefined;
}
