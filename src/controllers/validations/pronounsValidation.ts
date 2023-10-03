import { body } from "express-validator";
import defaultAudienceFieldValidation from "./defaultAudienceFieldValidation";

const pronounsValidation = [
	defaultAudienceFieldValidation,
	body("values.pronouns")
		.trim()
		.notEmpty()
		.withMessage("Pronouns should not be empty"),
];

export default pronounsValidation;
