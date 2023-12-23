import { faker } from "@faker-js/faker";

const getLastYear = (yearsFromToday: number): Date => {
	const today = new Date();

	const lastYear = new Date(
		today.getFullYear() - yearsFromToday,
		today.getMonth(),
		today.getDate(),
	);

	return lastYear;
};

export const getNotificationBetweenDates = (yearsFromToday = 1): Date => {
	const lastYear = getLastYear(yearsFromToday);
	const today = new Date();

	return faker.date.between({ from: lastYear, to: today });
};
