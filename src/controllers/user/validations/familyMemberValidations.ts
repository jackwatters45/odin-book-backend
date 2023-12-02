import { body } from "express-validator";
import { FAMILY_RELATIONSHIPS } from "../../../../types/familyMembers";
import defaultAudienceFieldValidation from "../../validations/defaultAudienceFieldValidation";
import userSearchValidation from "../../validations/userSearchValidation";

const familyMemberValidations = [
	defaultAudienceFieldValidation,
	...userSearchValidation,
	body("values.relationship")
		.optional()
		.isString()
		.withMessage("Relationship field must be a string.")
		.isIn(FAMILY_RELATIONSHIPS)
		.withMessage("Relationship field must be a valid relationship."),
];

export default familyMemberValidations;
