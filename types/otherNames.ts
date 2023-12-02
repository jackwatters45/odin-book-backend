export const OTHER_NAME_TYPES = [
	"Nickname",
	"Maiden Name",
	"Alternate Spelling",
	"Married Name",
	"Father's Name",
	"Birth Name",
	"Former Name",
	"Name with Title",
	"Other",
] as const;

export type OtherNameType = (typeof OTHER_NAME_TYPES)[number];

export interface IOtherName {
	_id: string;
	type: OtherNameType;
	name: string;
	showAtTop: boolean;
}

export type OtherNames = IOtherName[];
