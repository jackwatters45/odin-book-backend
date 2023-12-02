import { body } from "express-validator";
import defaultAudienceFieldValidation from "../../validations/defaultAudienceFieldValidation";
import { OTHER_NAME_TYPES } from "../../../../types/otherNames";

const otherNamesValidation = [
	defaultAudienceFieldValidation,
	body("values.name")
		.notEmpty()
		.isString()
		.withMessage("Name should be a non-empty string"),
	body("values.type")
		.isIn(OTHER_NAME_TYPES)
		.withMessage("Invalid type for other name"),
	body("values.showAtTop")
		.isBoolean()
		.withMessage("Show at top should be a boolean"),
];

export default otherNamesValidation;
