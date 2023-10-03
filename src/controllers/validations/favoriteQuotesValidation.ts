import { body } from "express-validator";
import defaultAudienceFieldValidation from "./defaultAudienceFieldValidation";

const favoriteQuotesValidation = [
	defaultAudienceFieldValidation,
	body("values")
		.optional()
		.isString()
		.withMessage("Favorite quotes  should be a string"),
];

export default favoriteQuotesValidation;
