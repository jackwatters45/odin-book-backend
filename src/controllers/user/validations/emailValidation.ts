import { body } from "express-validator";
import defaultAudienceFieldValidation from "../../validations/defaultAudienceFieldValidation";

const emailValidation = [
	defaultAudienceFieldValidation,
	body("values.email")
		.trim()
		.notEmpty()
		.withMessage("Email should not be empty")
		.isEmail()
		.withMessage("Email should be a valid email"),
];

export default emailValidation;
