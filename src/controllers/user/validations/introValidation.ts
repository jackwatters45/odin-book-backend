import { body } from "express-validator";
import { INTRO_FIELDS, IntroFieldsType } from "../../../../types/intro";

const introValidation = [
	body("intro")
		.isObject()
		.withMessage("Intro should be an object")
		.custom((intro) => {
			const introKeys = Object.keys(intro);
			return introKeys.every((key) =>
				INTRO_FIELDS.includes(key as IntroFieldsType),
			);
		})
		.withMessage(
			"Intro should only contain valid intro fields: pronouns, work, education, currentCity, hometown, relationshipStatus, namePronunciation, joined, websites, socialLinks",
		),
];

export default introValidation;
