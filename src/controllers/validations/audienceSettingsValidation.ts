import { body } from "express-validator";

import {
	AUDIENCE_STATUS_OPTIONS,
	AudienceStatusOptionsType,
} from "../../constants";
import {
	AudienceSettingsFields,
	AudienceSettingsKeys,
} from "../../../types/IUser";

const audienceSettingsValidation = [
	body()
		.custom((audienceSetting) => {
			const hasValidKeys = Object.keys(audienceSetting).every((key) =>
				AudienceSettingsFields.includes(key as AudienceSettingsKeys),
			);
			const hasValidValues = Object.values(audienceSetting).every((value) =>
				AUDIENCE_STATUS_OPTIONS.includes(value as AudienceStatusOptionsType),
			);
			return hasValidKeys && hasValidValues;
		})
		.withMessage("Invalid audience setting or value."),
];

export default audienceSettingsValidation;
