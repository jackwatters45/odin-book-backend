import { body } from "express-validator";
import { AUDIENCE_STATUS_OPTIONS } from "../../../types/audience";

const defaultAudienceFieldValidation = body("audience")
	.optional()
	.trim()
	.isIn(AUDIENCE_STATUS_OPTIONS)
	.withMessage("Audience should be a valid audience");

export default defaultAudienceFieldValidation;
