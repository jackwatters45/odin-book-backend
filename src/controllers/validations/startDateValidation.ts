import { body } from "express-validator";

const startDateValidation = [
	body("values.startYear")
		.optional()
		.isInt()
		.withMessage("Start year field must be an integer."),
	body("values.startMonth")
		.optional()
		.isInt()
		.withMessage("Start month field must be an integer."),
	body("values.startDay")
		.optional()
		.isInt()
		.withMessage("Start day field must be an integer."),
];

export default startDateValidation;
