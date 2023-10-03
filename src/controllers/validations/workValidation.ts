import { body } from "express-validator";
import defaultAudienceFieldValidation from "./defaultAudienceFieldValidation";
import startEndDateValidation from "./startEndDateValidation";

const workValidation = [
	defaultAudienceFieldValidation,
	...startEndDateValidation,
	body("values.current")
		.notEmpty()
		.withMessage("Current field should not be empty.")
		.isBoolean()
		.withMessage("Current field must be a boolean."),
	body("values.company")
		.trim()
		.notEmpty()
		.withMessage("Company field should not be empty."),
	body("values.position")
		.trim()
		.optional()
		.isString()
		.withMessage("Position field must be a string."),

	body("values.city")
		.trim()
		.optional()
		.isString()
		.withMessage("City field must be a string."),
	body("values.description")
		.trim()
		.optional()
		.isString()
		.withMessage("Description field must be a string."),
];

export default workValidation;
