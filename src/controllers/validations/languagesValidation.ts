import { body } from "express-validator";
import defaultAudienceFieldValidation from "./defaultAudienceFieldValidation";

const languagesValidation = [
	defaultAudienceFieldValidation,
	body("values.languages")
		.isArray({ min: 1 })
		.withMessage("Languages should be an array of at least one language")
		.custom((languages) =>
			languages.every((language: string) => typeof language === "string"),
		)
		.withMessage("Languages should be strings"),
];

export default languagesValidation;
