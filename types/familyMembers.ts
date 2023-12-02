import { IUserSearchBase } from "./search";

export const MALE_FAMILY_RELATIONSHIPS = [
	"Father",
	"Son",
	"Brother",
	"Uncle",
	"Nephew",
	"Cousin (male)",
	"Grandfather",
	"Grandson",
	"Stepbrother",
	"Stepfather",
	"Stepson",
	"Brother-in-law",
	"Father-in-law",
	"Son-in-law",
];

export const FEMALE_FAMILY_RELATIONSHIPS = [
	"Mother",
	"Daughter",
	"Sister",
	"Aunt",
	"Cousin (female)",
	"Grandmother",
	"Granddaughter",
	"Stepsister",
	"Stepmother",
	"Stepdaughter",
	"Sister-in-law",
	"Mother-in-law",
	"Daughter-in-law",
];

export const GENDER_NEUTRAL_FAMILY_RELATIONSHIPS = [
	"Sibling",
	"Parent",
	"Child",
	"Sibling of Parent",
	"Child of Sibling",
	"Cousin",
	"Grandparent",
	"Grandchild",
	"Step Sibling",
	"Step Parent",
	"Step Child",
	"Sibling-in-law",
	"Parent-in-law",
	"Child-in-law",
	"Family member",
];

export const FAMILY_RELATIONSHIPS = [
	...MALE_FAMILY_RELATIONSHIPS,
	...FEMALE_FAMILY_RELATIONSHIPS,
	...GENDER_NEUTRAL_FAMILY_RELATIONSHIPS,
];

export type FamilyRelationshipOptionsType =
	(typeof FAMILY_RELATIONSHIPS)[number];

export interface IFamilyMember extends Partial<IUserSearchBase> {
	relationship: FamilyRelationshipOptionsType;
}
