import { body } from "express-validator";
import defaultAudienceFieldValidation from "../../validations/defaultAudienceFieldValidation";

const namePronunciationValidation = [
	defaultAudienceFieldValidation,
	body("values")
		.optional()
		.isString()
		.withMessage("Name pronunciation should be a string"),
];
export default namePronunciationValidation;
