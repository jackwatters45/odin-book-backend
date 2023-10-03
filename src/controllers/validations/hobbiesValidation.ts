import { body } from "express-validator";
import hobbiesBank from "../../models/data/hobbies";

const hobbiesValidation = [
	body("hobbies")
		.isArray({ min: 1 })
		.withMessage("Hobbies should be an array of at least one hobby")
		.custom((hobbies) =>
			hobbies.every(
				(hobby: string) => !!hobbiesBank.find((h) => h.name === hobby),
			),
		)
		.withMessage("Hobbies should be valid hobbies"),
];

export default hobbiesValidation;
