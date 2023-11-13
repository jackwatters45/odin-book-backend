import { BadRequestError } from "../middleware/errorConfig";

const validateBirthdayDate = (birthDate: Date) => {
	const currentDate = new Date();
	let age = currentDate.getFullYear() - birthDate.getFullYear();
	const m = currentDate.getMonth() - birthDate.getMonth();

	if (m < 0 || (m === 0 && currentDate.getDate() < birthDate.getDate())) {
		age--;
	}

	if (age < 13) {
		throw new BadRequestError(
			"User must be at least 13 years old to register.",
		);
	}

	return true;
};

export default validateBirthdayDate;
