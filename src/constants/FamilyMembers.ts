import { IUserSearchBase } from "./IUserSearchBase";

export const FamilyRelationshipOptions = [
	"Mother",
	"Father",
	"Daughter",
	"Son",
	"Sister",
	"Brother",
	"Aunt",
	"Uncle",
	"Nephew",
	"Cousin (female)",
	"Cousin (male)",
	"Grandmother",
	"Grandfather",
	"Granddaughter",
	"Grandson",
	"Stepsister",
	"Stepbrother",
	"Stepmother",
	"Stepfather",
	"Stepdaughter",
	"Stepson",
	"Sister-in-law",
	"Brother-in-law",
	"Mother-in-law",
	"Father-in-law",
	"Daughter-in-law",
	"Son-in-law",
	"Sibling (gender neutral)",
	"Parent (gender neutral)",
	"Child (gender neutral)",
	"Sibling of Parent (gender neutral)",
	"Child of Sibling (gender neutral)",
	"Cousin (gender neutral)",
	"Grandparent (gender neutral)",
	"Grandchild (gender neutral)",
	"Step Sibling (gender neutral)",
	"Step Parent (gender neutral)",
	"Step Child (gender neutral)",
	"Sibling-in-law (gender neutral)",
	"Parent-in-law (gender neutral)",
	"Child-in-law (gender neutral)",
	"Family member (gender neutral)",
	"Pet (gender neutral)",
];

export type FamilyRelationshipOptionsType =
	(typeof FamilyRelationshipOptions)[number];

export interface FamilyMember extends IUserSearchBase {
	relationship: FamilyRelationshipOptionsType;
}
