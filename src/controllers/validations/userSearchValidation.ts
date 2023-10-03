import { body } from "express-validator";

const userSearchValidation = [
	body("values._id")
		.optional()
		.isString()
		.withMessage("_id field must be a string."),
	body("values.name")
		.optional()
		.isString()
		.withMessage("Name field must be a string."),
	body("values")
		.notEmpty()
		.withMessage("Values field is required and should be an object."),
];

export default userSearchValidation;
