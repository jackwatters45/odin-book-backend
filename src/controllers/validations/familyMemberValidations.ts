import { body } from "express-validator";
import userSearchValidation from "./userSearchValidation";
import defaultAudienceFieldValidation from "./defaultAudienceFieldValidation";
import { FamilyRelationshipOptions } from "../../constants/FamilyMembers";

const familyMemberValidations = [
	defaultAudienceFieldValidation,
	...userSearchValidation,
	body("values.relationship")
		.optional()
		.isString()
		.withMessage("Relationship field must be a string.")
		.isIn(FamilyRelationshipOptions)
		.withMessage("Relationship field must be a valid relationship."),
];

export default familyMemberValidations;
