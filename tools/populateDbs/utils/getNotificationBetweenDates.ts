import { faker } from "@faker-js/faker";

const getLastYear = () => {
	const today = new Date();
	const lastYear = new Date(
		today.getFullYear() - 1,
		today.getMonth(),
		today.getDate(),
	);

	return lastYear;
};

export const getNotificationBetweenDates = (): Date => {
	const lastYear = getLastYear();
	const today = new Date();

	return faker.date.between({ from: lastYear, to: today });
};
