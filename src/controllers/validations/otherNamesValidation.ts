import { body } from "express-validator";
import defaultAudienceFieldValidation from "./defaultAudienceFieldValidation";
import { otherNameTypeOptions } from "../../constants/OtherNames";

const otherNamesValidation = [
	defaultAudienceFieldValidation,
	body("values.name")
		.notEmpty()
		.isString()
		.withMessage("Name should be a non-empty string"),
	body("values.type")
		.isIn(otherNameTypeOptions)
		.withMessage("Invalid type for other name"),
	body("values.showAtTop")
		.isBoolean()
		.withMessage("Show at top should be a boolean"),
];

export default otherNamesValidation;
