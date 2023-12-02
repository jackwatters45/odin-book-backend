import { body } from "express-validator";
import defaultAudienceFieldValidation from "../../validations/defaultAudienceFieldValidation";

const pronounsValidation = [
	defaultAudienceFieldValidation,
	body("values.pronouns")
		.trim()
		.notEmpty()
		.withMessage("Pronouns should not be empty"),
];

export default pronounsValidation;
