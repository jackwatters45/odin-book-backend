import { body } from "express-validator";
import defaultAudienceFieldValidation from "./defaultAudienceFieldValidation";
import { PLACES_LIVED_TYPE } from "../../constants";
import startDateValidation from "./startDateValidation";

const placesLivedValidation = [
	defaultAudienceFieldValidation,
	...startDateValidation,
	body("values").isObject().withMessage("Values should be an object"),
	body("values.type")
		.trim()
		.notEmpty()
		.withMessage("Type should not be empty")
		.isIn(PLACES_LIVED_TYPE)
		.withMessage("Type should be current, hometown, or default"),
	body("values.city").trim().notEmpty().withMessage("City should not be empty"),
	body("values.state")
		.trim()
		.notEmpty()
		.withMessage("State should not be empty"),
	body("values.country")
		.trim()
		.notEmpty()
		.withMessage("Country should not be empty"),
];

export default placesLivedValidation;
