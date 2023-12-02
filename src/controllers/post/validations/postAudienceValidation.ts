import { body } from "express-validator";
import authenticateJwt from "../../../middleware/authenticateJwt";
import { AUDIENCE_STATUS_OPTIONS } from "../../../../types/audience";

const postAudienceValidation = [
	authenticateJwt,
	body("audience")
		.trim()
		.isIn(AUDIENCE_STATUS_OPTIONS)
		.withMessage("Invalid audience"),
];

export default postAudienceValidation;
