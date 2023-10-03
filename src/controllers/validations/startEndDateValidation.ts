import { body } from "express-validator";
import startDateValidation from "./startDateValidation";

const startEndDateValidation = [
	...startDateValidation,
	body("values.endYear")
		.optional()
		.isInt()
		.withMessage("End year field must be an integer."),
	body("values.endMonth")
		.optional()
		.isInt()
		.withMessage("End month field must be an integer."),
	body("values.endDay")
		.optional()
		.isInt()
		.withMessage("End day field must be an integer."),
];

export default startEndDateValidation;
