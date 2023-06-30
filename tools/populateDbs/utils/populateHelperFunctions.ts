/* eslint-disable @typescript-eslint/no-explicit-any */
import { faker } from "@faker-js/faker";
import debug from "debug";

const log = debug("log");

export const getRandomInt = (max = 5) => {
	return Math.floor(Math.random() * max);
};

export const getRandValueFromArray = (arr: any[]) => {
	return arr[getRandomInt(arr.length)];
};

export const getRandValueFromArrayObjs = (
	arr: any[],
	selectedValue = "_id",
) => {
	const randElement = arr[getRandomInt(arr.length)];
	if (!randElement) log(arr);
	return selectedValue && selectedValue in randElement
		? randElement[selectedValue]
		: randElement;
};

export const getRandValuesFromArray = (arr: any[], max = 3) => {
	const copyArr = [...arr];
	for (let i = copyArr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copyArr[i], copyArr[j]] = [copyArr[j], copyArr[i]];
	}
	return copyArr.slice(0, max);
};

export const getRandValuesFromArrayObjs = (
	arr: any[],
	max = 3,
	selectedValue = "_id",
) => {
	const copyArr = [...arr];
	for (let i = copyArr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copyArr[i], copyArr[j]] = [copyArr[j], copyArr[i]];
	}
	const selected = copyArr.slice(0, max);

	if (selectedValue) {
		return selected.map((item) => item[selectedValue]);
	}

	return selected;
};

export const getComments = (arr: any[], max = 3, post: string) => {
	const users = getRandValuesFromArray(arr, max);
	return users.map((user) => ({
		author: user,
		content: faker.lorem.sentence(),
		post,
		likes: getRandValuesFromArray(arr, 5),
	}));
};

export const convertToSlug = (text: string) =>
	text.replace(/\s+/g, "-").toLowerCase();

export const formatYears = (
	yearsStartJob: number[],
): {
	startDate: Date;
	endDate: Date | null;
}[] => {
	const datesStartJob = yearsStartJob.map((year) =>
		getRandomDateFromYear(year),
	);
	return datesStartJob.map((year, index) => ({
		startDate: year,
		endDate: datesStartJob[index + 1] ?? null,
	}));
};

export const formatPlacesLived = (
	placesLived: { city: string; country: string; dateMovedIn: Date }[],
) => {
	return placesLived.map((place, index) => {
		const { city, country, dateMovedIn } = place;
		return {
			city,
			country,
			dateMovedIn,
			dateMovedOut: placesLived[index + 1]?.dateMovedIn ?? null,
		};
	});
};

export const getRandomDateFromYear = (year: number): Date => {
	const startDate = new Date(year, 0, 1).getTime();
	const endDate = new Date(year, 11, 31).getTime();
	return faker.date.between({ from: startDate, to: endDate });
};

export const getRandomBirthYear = (
	minAge = 13,
	maxAge = 80,
): [Date, number] => {
	const currentYear = new Date().getFullYear();
	const year = faker.number.int({
		min: currentYear - maxAge,
		max: currentYear - minAge,
	});
	const birthDate = getRandomDateFromYear(year);
	return [birthDate, currentYear - year];
};
