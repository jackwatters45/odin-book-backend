import { body } from "express-validator";
import { reactionTypes } from "../../../models/reaction.model";

const postReactionValidation = [
	body("type").trim().isIn(reactionTypes).withMessage("Invalid reaction type"),
	body("user").trim().isMongoId().withMessage("Invalid user id"),
	body("post").trim().isMongoId().withMessage("Invalid post id"),
];

export default postReactionValidation;
