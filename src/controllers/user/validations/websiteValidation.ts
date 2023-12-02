import { body } from "express-validator";
import defaultAudienceFieldValidation from "../../validations/defaultAudienceFieldValidation";

const websiteValidation = [
	defaultAudienceFieldValidation,
	body("values.websites")
		.optional()
		.isArray()
		.withMessage("Websites field must be an array.")
		.custom((websites: string[]) => {
			return websites.every((website) => {
				return typeof website === "string";
			});
		}),
];

export default websiteValidation;
