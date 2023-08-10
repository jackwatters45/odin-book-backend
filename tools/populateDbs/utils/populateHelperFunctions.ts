import { faker } from "@faker-js/faker";
import debug from "debug";
import { ObjectId } from "mongoose";

const log = debug("log:populateHelperFunctions");

export const getRandomInt = (max = 5) => Math.floor(Math.random() * max);

export const getRandValueFromArray = <T>(arr: T[]) => {
	return arr[getRandomInt(arr.length)];
};

interface objectWithId {
	_id: ObjectId;
}

export const getRandValueFromArrayOfObjs = <T extends objectWithId>(
	arr: T[],
	selectedValue?: keyof T,
) => {
	const selectedItem = arr[getRandomInt(arr.length)];

	if (!selectedValue) return selectedItem._id;

	if (selectedValue in selectedItem) return selectedItem[selectedValue];
	else {
		throw new Error(
			`Property ${String(selectedValue)} does not exist on selected item`,
		);
	}
};

export const getRandValuesFromArray = <T>(arr: T[], max = 3) => {
	const copyArr = [...arr];
	for (let i = copyArr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copyArr[i], copyArr[j]] = [copyArr[j], copyArr[i]];
	}
	return copyArr.slice(0, max);
};

export const getRandValuesFromArrayOfObjs = <T extends objectWithId>(
	arr: T[],
	max = 3,
	selectedValue?: keyof T,
) => {
	const copyArr = [...arr];
	for (let i = copyArr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copyArr[i], copyArr[j]] = [copyArr[j], copyArr[i]];
	}
	return copyArr.slice(0, max).map((item) => {
		return selectedValue ? item[selectedValue] : item._id;
	});
};

export const convertToSlug = (text: string) =>
	text.replace(/\s+/g, "-").toLowerCase();

//
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

// export const getRandomBirthYear = (
// 	minAge = 13,
// 	maxAge = 80,
// ): [Date, number] => {
// 	const currentYear = new Date().getFullYear();
// 	const year = faker.number.int({
// 		min: currentYear - maxAge,
// 		max: currentYear - minAge,
// 	});
// 	const birthDate = getRandomDateFromYear(year);
// 	return [birthDate, currentYear - year];
// };

export const getAgeFromBirthday = (birthday: Date) => {
	const ageDifMs = Date.now() - birthday.getTime();
	const ageDate = new Date(ageDifMs);
	return Math.abs(ageDate.getUTCFullYear() - 1970);
};
