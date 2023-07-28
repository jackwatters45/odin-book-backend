import { body } from "express-validator";
import { Types } from "mongoose";

const postValidation = [
	body("published").isBoolean().withMessage("Published must be a boolean"),
	body("content")
		.optional()
		.isString()
		.withMessage("Content must be a string")
		.isLength({ max: 63206 })
		.withMessage("Content must be less than 63206 characters"),
	body("taggedUsers")
		.optional()
		.isArray()
		.withMessage("Tagged users must be an array")
		.custom((value) => {
			return !value.some((user: string) => !Types.ObjectId.isValid(user));
		})
		.withMessage("Tagged users must be an array of valid user ids"),
	body("sharedFrom")
		.optional()
		.custom((value) => Types.ObjectId.isValid(value))
		.withMessage("SharedFrom must be a valid ObjectId"),
	body("media").optional().isString().withMessage("Media must be a string"),
	body("feeling").optional().isString().withMessage("Feeling must be a string"),
	body("lifeEvent")
		.optional()
		.isObject()
		.withMessage("LifeEvent must be an object")
		.custom((value) => {
			if (
				typeof value.title !== "string" ||
				typeof value.description !== "string" ||
				Object.prototype.toString.call(value.date) !== "[object Date]"
			) {
				throw new Error("Invalid lifeEvent object");
			}
			return true;
		}),
	body("checkIn")
		.optional()
		.isObject()
		.withMessage("CheckIn must be an object")
		.custom((value) => {
			if (
				typeof value.longitude !== "number" ||
				typeof value.latitude !== "number"
			) {
				throw new Error("Invalid checkIn object");
			}
			return true;
		}),
	body()
		.custom((value, { req }) => {
			return !(
				!req.body.sharedFrom &&
				!req.body.content &&
				!req.body.media &&
				!req.body.feeling &&
				!req.body.lifeEvent &&
				!req.body.checkIn
			);
		})
		.withMessage(
			"At least one of the fields 'content', 'media' 'feeling', 'lifeEvent', or 'checkIn' must be provided",
		),
];

export default postValidation;
