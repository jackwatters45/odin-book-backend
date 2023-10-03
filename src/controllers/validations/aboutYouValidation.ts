import { body } from "express-validator";
import defaultAudienceFieldValidation from "./defaultAudienceFieldValidation";

const aboutYouValidation = [
	defaultAudienceFieldValidation,
	body("values")
		.notEmpty()
		.withMessage("About you should not be empty")
		.isString()
		.withMessage("About you should be a string"),
];

export default aboutYouValidation;
