import { body } from "express-validator";
import { AUDIENCE_FIELDS, AudienceFieldsType } from "../../../types/IUser";
import {
	AUDIENCE_STATUS_OPTIONS,
	AudienceStatusOptionsType,
} from "../../constants";

const audienceSettingsValidation = [
	body()
		.custom((audienceSetting) => {
			const hasValidKeys = Object.keys(audienceSetting).every((key) =>
				AUDIENCE_FIELDS.includes(key as AudienceFieldsType),
			);
			const hasValidValues = Object.values(audienceSetting).every((value) =>
				AUDIENCE_STATUS_OPTIONS.includes(value as AudienceStatusOptionsType),
			);
			return hasValidKeys && hasValidValues;
		})
		.withMessage("Invalid audience setting or value."),
];

export default audienceSettingsValidation;
