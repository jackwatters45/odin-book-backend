import { body } from "express-validator";

const bioValidation = [
	body("bio")
		.trim()
		.notEmpty()
		.withMessage("Bio should not be empty")
		.isLength({ max: 101 })
		.withMessage("Bio should not be longer than 101 characters"),
];

export default bioValidation;
