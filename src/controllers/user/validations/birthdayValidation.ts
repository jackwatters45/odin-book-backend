import { body } from "express-validator";
import defaultAudienceFieldValidation from "../../validations/defaultAudienceFieldValidation";

const birthdayValidation = [
	defaultAudienceFieldValidation,
	body("values.Year")
		.optional()
		.isInt()
		.withMessage("Year field must be an integer."),
	body("values.Month")
		.optional()
		.isInt()
		.withMessage("Month field must be an integer."),
	body("values.Day")
		.optional()
		.isInt()
		.withMessage("Day field must be an integer."),
	body("birthday"),
];

export default birthdayValidation;
