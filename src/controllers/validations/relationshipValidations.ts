import { body } from "express-validator";
import { VALID_RELATIONSHIP_STATUSES_ARRAY } from "../../constants";
import defaultAudienceFieldValidation from "./defaultAudienceFieldValidation";
import userSearchValidation from "./userSearchValidation";
import startDateValidation from "./startDateValidation";

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
