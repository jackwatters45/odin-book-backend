export const DefaultGenderTypes = ["Male", "Female", "Nonbinary", "Other"];

export type GenderTypesType = (typeof DefaultGenderTypes)[number];

export type Gender = {
	defaultType: GenderTypesType;
	other: string | undefined;
};
