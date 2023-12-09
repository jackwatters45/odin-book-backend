import { body } from "express-validator";

const createUserValidation = [
	body("firstName")
		.trim()
		.notEmpty()
		.withMessage("First name is required and should not be empty"),
	body("lastName")
		.trim()
		.notEmpty()
		.withMessage("Last name is required and should not be empty"),
	body("username")
		.trim()
		.notEmpty()
		.withMessage(
			"Username id is required and should be a valid email or phone number",
		),
	body("password")
		.trim()
		.notEmpty()
		.isLength({ min: 8 })
		.withMessage("Password should be at least 8 characters long")
		.matches(
			/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*?()])[A-Za-z\d!@#$%^&*?()]{8,}$/,
			"i",
		)
		.withMessage(
			"Password must contain at least one uppercase letter, one lowercase letter, one special character, one number, and be at least 8 characters long",
		),
	body("birthday")
		.trim()
		.notEmpty()
		.isISO8601()
		.withMessage(
			"Birthday is required and should be a valid date in ISO 8601 format",
		),
	body("pronouns")
		.optional()
		.trim()
		.notEmpty()
		.withMessage("Pronouns should not be empty if provided"),
	body("userType")
		.trim()
		.isIn(["admin", "user"])
		.withMessage("User type must be either admin or user"),
];

export default createUserValidation;
