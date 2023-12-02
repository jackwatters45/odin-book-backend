import { IGender, GenderTypesType } from "../../types/gender";
import { FAMILY_RELATIONSHIPS } from "../../types/familyMembers";

const getReciprocal = (
	gender: GenderTypesType,
	male: string,
	female: string,
	neutral: string,
) => (gender === "Male" ? male : gender === "Female" ? female : neutral);

const getParentReciprocal = (gender: GenderTypesType) =>
	getReciprocal(gender, "Son", "Daughter", "Child");

const getChildReciprocal = (gender: GenderTypesType) =>
	getReciprocal(gender, "Father", "Mother", "Parent");

const getSiblingReciprocal = (gender: GenderTypesType) =>
	getReciprocal(gender, "Brother", "Sister", "Sibling");

const getSiblingOfParentReciprocal = (gender: GenderTypesType) =>
	getReciprocal(gender, "Uncle", "Aunt", "Sibling of Parent");

const getChildOfSiblingReciprocal = (gender: GenderTypesType) =>
	getReciprocal(gender, "Nephew", "Niece", "Child of Sibling");

const getCousinReciprocal = (gender: GenderTypesType) =>
	getReciprocal(gender, "Cousin (male)", "Cousin (female)", "Cousin");

const getGrandparentReciprocal = (gender: GenderTypesType) =>
	getReciprocal(gender, "Grandson", "Granddaughter", "Grandchild");

const getGrandchildReciprocal = (gender: GenderTypesType) =>
	getReciprocal(gender, "Grandfather", "Grandmother", "Grandparent");

const getStepSiblingReciprocal = (gender: GenderTypesType) =>
	getReciprocal(gender, "Stepbrother", "Stepsister", "Step Sibling");

const getStepParentReciprocal = (gender: GenderTypesType) =>
	getReciprocal(gender, "Stepson", "Stepdaughter", "Step Child");

const getStepChildReciprocal = (gender: GenderTypesType) =>
	getReciprocal(gender, "Stepfather", "Stepmother", "Step Parent");

const getSiblingInLawReciprocal = (gender: GenderTypesType) =>
	getReciprocal(gender, "Sister-in-law", "Brother-in-law", "Sibling-in-law");

const getParentInLawReciprocal = (gender: GenderTypesType) =>
	getReciprocal(gender, "Son-in-law", "Daughter-in-law", "Child-in-law");

const getChildInLawReciprocal = (gender: GenderTypesType) =>
	getReciprocal(gender, "Father-in-law", "Mother-in-law", "Parent-in-law");

export const getReciprocalRelationship = (
	relationship: keyof typeof FAMILY_RELATIONSHIPS,
	userGender: IGender | undefined,
) => {
	const gender = userGender ? userGender.defaultType : "Other";

	const reciprocalRelationships = {
		Mother: () => getParentReciprocal(gender),
		Father: () => getParentReciprocal(gender),
		Parent: () => getParentReciprocal(gender),
		Son: () => getChildReciprocal(gender),
		Daughter: () => getChildReciprocal(gender),
		Child: () => getChildReciprocal(gender),
		Sister: () => getSiblingReciprocal(gender),
		Brother: () => getSiblingReciprocal(gender),
		Sibling: () => getSiblingReciprocal(gender),
		Uncle: () => getSiblingOfParentReciprocal(gender),
		Aunt: () => getSiblingOfParentReciprocal(gender),
		"Sibling of Parent": () => getSiblingOfParentReciprocal(gender),

		Nephew: () => getChildOfSiblingReciprocal(gender),
		Niece: () => getChildOfSiblingReciprocal(gender),
		"Child of Sibling": () => getChildOfSiblingReciprocal(gender),

		"Cousin (male)": () => getCousinReciprocal(gender),
		"Cousin (female": () => getCousinReciprocal(gender),
		Cousin: () => getCousinReciprocal(gender),

		Grandfather: () => getGrandparentReciprocal(gender),
		Grandmother: () => getGrandparentReciprocal(gender),
		Grandparent: () => getGrandparentReciprocal(gender),

		Grandson: () => getGrandchildReciprocal(gender),
		Granddaughter: () => getGrandchildReciprocal(gender),
		Grandchild: () => getGrandchildReciprocal(gender),

		Stepbrother: () => getStepSiblingReciprocal(gender),
		Stepsister: () => getStepSiblingReciprocal(gender),
		"Step Sibling": () => getStepSiblingReciprocal(gender),

		Stepfather: () => getStepParentReciprocal(gender),
		Stepmother: () => getStepParentReciprocal(gender),
		"Step Parent": () => getStepParentReciprocal(gender),

		Stepson: () => getStepChildReciprocal(gender),
		Stepdaughter: () => getStepChildReciprocal(gender),
		"Step Child": () => getStepChildReciprocal(gender),

		"Brother-in-law": () => getSiblingInLawReciprocal(gender),
		"Sister-in-law": () => getSiblingInLawReciprocal(gender),
		"Sibling-in-law": () => getSiblingInLawReciprocal(gender),

		"Father-in-law": () => getParentInLawReciprocal(gender),
		"Mother-in-law": () => getParentInLawReciprocal(gender),
		"Parent-in-law": () => getParentInLawReciprocal(gender),

		"Son-in-law": () => getChildInLawReciprocal(gender),
		"Daughter-in-law": () => getChildInLawReciprocal(gender),
		"Child-in-law": () => getChildInLawReciprocal(gender),

		"Family member": () => "Family member",
	};

	return reciprocalRelationships[
		relationship as keyof typeof reciprocalRelationships
	]?.();
};
