import { body } from "express-validator";
import defaultAudienceFieldValidation from "../../validations/defaultAudienceFieldValidation";

const genderValidation = [
	defaultAudienceFieldValidation,
	body("values.gender")
		.trim()
		.notEmpty()
		.withMessage("Gender should not be empty"),
];

export default genderValidation;
