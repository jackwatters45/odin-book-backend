import { body } from "express-validator";
import defaultAudienceFieldValidation from "./defaultAudienceFieldValidation";

const phoneNumberValidation = [
	defaultAudienceFieldValidation,
	body("values.phoneNumber")
		.trim()
		.notEmpty()
		.withMessage("Phone number should not be empty")
		.isMobilePhone("any")
		.withMessage("Phone number should be a valid phone number"),
];

export default phoneNumberValidation;
