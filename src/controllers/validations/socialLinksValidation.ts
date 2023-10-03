import { body } from "express-validator";
import defaultAudienceFieldValidation from "./defaultAudienceFieldValidation";
import { VALID_SOCIAL_PLATFORMS_ARRAY } from "../../constants";

const socialLinksValidation = [
	defaultAudienceFieldValidation,
	body("values.platform")
		.trim()
		.notEmpty()
		.withMessage("Platform should not be empty")
		.isIn(VALID_SOCIAL_PLATFORMS_ARRAY)
		.withMessage("Invalid platform"),
	body("values.username")
		.trim()
		.notEmpty()
		.withMessage("Username should not be empty")
		.isLength({ min: 1 })
		.withMessage("Username should be at least 1 character long"),
];

export default socialLinksValidation;
