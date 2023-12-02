import { body } from "express-validator";
import { Types } from "mongoose";
import { FEELING_NAMES } from "../../../../types/feelings";

const postValidation = [
	body("content")
		.optional()
		.isString()
		.withMessage("Content must be a string")
		.isLength({ max: 5280 })
		.withMessage("Content must be less than 5280 characters"),
	body("taggedUsers[]")
		.optional()
		.isArray()
		.withMessage("Tagged users must be an array")
		.isLength({ max: 10 })
		.withMessage("Tagged users must be less than or equal to 10 users")
		.custom((value) => value.every((id: string) => Types.ObjectId.isValid(id)))
		.withMessage("Tagged users must be an array of valid user ids"),
	body("sharedFrom")
		.optional()
		.custom((value) => Types.ObjectId.isValid(value))
		.withMessage("SharedFrom must be a valid ObjectId"),
	body("feeling")
		.optional()
		.isString()
		.withMessage("Feeling must be an object")
		.isIn([...FEELING_NAMES, ""])
		.withMessage("Feeling must be a valid Feeling type"),
	body("to").optional().isMongoId().withMessage("To must be a valid ObjectId"),
	body("checkIn")
		.optional()
		.isObject()
		.withMessage("CheckIn must be an object"),
	body("checkIn.location")
		.optional()
		.isString()
		.withMessage("CheckIn location must be a string"),
	body("checkIn.city")
		.optional()
		.isString()
		.withMessage("CheckIn city must be a string")
		.isLength({ max: 50 })
		.withMessage("CheckIn city must be less than 50 characters"),
	body("checkIn.state")
		.optional()
		.isString()
		.withMessage("CheckIn state must be a string"),
	body("checkIn.country")
		.optional()
		.isString()
		.withMessage("CheckIn country must be a string"),
	body()
		.custom((value, { req }) => {
			return !(
				!req.body.sharedFrom &&
				!req.body.content &&
				!req.body.media &&
				!req.body.feeling &&
				!req.body.checkIn &&
				req.body.sharedFrom
			);
		})
		.withMessage(
			"At least one of the fields 'content', 'media' 'feeling', or 'checkIn' must be provided",
		),
];

export default postValidation;
