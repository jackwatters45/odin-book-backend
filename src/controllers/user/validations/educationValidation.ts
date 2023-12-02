import { body } from "express-validator";
import defaultAudienceFieldValidation from "../../validations/defaultAudienceFieldValidation";
import startEndDateValidation from "../../validations/startEndDateValidation";
import {
	VALID_ATTENDED_FOR,
	VALID_EDUCATION_TYPES,
} from "../../../../types/education";

const educationValidation = [
	defaultAudienceFieldValidation,
	...startEndDateValidation,
	body("values.type")
		.trim()
		.notEmpty()
		.withMessage("Type should not be empty")
		.isIn(VALID_EDUCATION_TYPES)
		.withMessage("Type should be one of the valid education types"),
	body("values.school")
		.trim()
		.notEmpty()
		.withMessage("School should not be empty")
		.isString()
		.withMessage("School should be a string"),
	body("values.graduated")
		.notEmpty()
		.withMessage("Graduated should not be empty")
		.isBoolean()
		.withMessage("Graduated should be a boolean"),
	body("values.degree")
		.trim()
		.optional()
		.isString()
		.withMessage("Degree should be a string"),
	body("values.attendedFor")
		.trim()
		.optional()
		.isIn(VALID_ATTENDED_FOR)
		.withMessage("Attended for should be one of the valid attended for types"),
	body("values.concentrations")
		.optional()
		.isArray()
		.withMessage("Concentrations should be an array")
		.custom((value: string[]) => {
			if (value.length > 0) {
				return value.every(
					(concentration) => typeof concentration === "string",
				);
			}
			return true;
		}),
	body("values.description")
		.trim()
		.optional()
		.isString()
		.withMessage("Description should be a string"),
];

export default educationValidation;
