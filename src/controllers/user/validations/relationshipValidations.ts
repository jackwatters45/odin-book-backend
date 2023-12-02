import { body } from "express-validator";
import defaultAudienceFieldValidation from "../../validations/defaultAudienceFieldValidation";
import userSearchValidation from "../../validations/userSearchValidation";
import startDateValidation from "../../validations/startDateValidation";
import { VALID_RELATIONSHIP_STATUSES_ARRAY } from "../../../../types/relationshipStatus";

const relationshipValidation = [
	defaultAudienceFieldValidation,
	...userSearchValidation,
	...startDateValidation,
	body("values.status")
		.trim()
		.notEmpty()
		.withMessage("Status field must not be empty.")
		.isIn(VALID_RELATIONSHIP_STATUSES_ARRAY)
		.withMessage("Status field must be a valid relationship status."),
];

export default relationshipValidation;
