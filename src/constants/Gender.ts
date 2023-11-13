export const DefaultGenderTypes = [
	"Male",
	"Female",
	"Nonbinary",
	"Other",
] as const;

export type GenderTypesType = (typeof DefaultGenderTypes)[number];

export type Gender = {
	defaultType: GenderTypesType;
	other: string | undefined;
};
