export const otherNameTypeOptions = [
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

export type OtherNameType = (typeof otherNameTypeOptions)[number];

export interface OtherName {
	_id: string;
	type: OtherNameType;
	name: string;
	showAtTop: boolean;
}

export type OtherNames = OtherName[];
