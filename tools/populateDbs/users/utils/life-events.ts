import { faker } from "@faker-js/faker";
import {
	LifeEventData,
} from "../../../../src/models/user-model/user-about.model";
import {
	formatPlacesLived,
	formatYears,
	getRandomBirthYear,
	getRandomDateFromYear,
} from "../../utils/populateHelperFunctions";

export const getLifeEvents = () => {
	const [birthDate, age] = getRandomBirthYear();
	const lifeEvents: LifeEventData[] = [];

	let currentAge = 0;
	let currentCity = faker.location.city();

	let currentJob;
	const yearsStartJob: number[] = [];
	let jobCounter = 0;

	let goingToCollege = false;
	let graduatedHighSchool = false;
	const yearsGraduateSchool: number[] = [];
	let educationCounter = 0;

	const placesLived: { city: string; country: string; dateMovedIn: Date }[] =
		[];

	let currentRelationship;

	const birthPlace = {
		city: currentCity,
		country: faker.location.country(),
		dateMovedIn: birthDate,
	};
	lifeEvents.push({
		title: "Born",
		description: `Born in ${birthPlace.city}, ${birthPlace.country}`,
		date: birthDate,
	});
	placesLived.push(birthPlace);

	while (currentAge < age) {
		if (faker.datatype.boolean(0.05)) {
			currentCity = faker.location.city();
			const country = faker.location.country();
			const dateMovedIn = getRandomDateFromYear(
				birthDate.getFullYear() + currentAge,
			);
			lifeEvents.push({
				title: "Moved",
				description: `Moved to ${currentCity}, ${country}`,
				date: dateMovedIn,
			});
			placesLived.push({
				city: currentCity,
				country,
				dateMovedIn,
			});
		}

		if (
			currentAge >= 18 &&
			!graduatedHighSchool &&
			faker.datatype.boolean(0.95)
		) {
			yearsGraduateSchool.push(birthDate.getFullYear() + currentAge);
			graduatedHighSchool = true;
			goingToCollege = faker.datatype.boolean(0.8);
		}

		if (
			currentAge === 22 + educationCounter * 5 &&
			faker.datatype.boolean(0.8) &&
			goingToCollege &&
			educationCounter === 0
		) {
			yearsGraduateSchool.push(birthDate.getFullYear() + currentAge);
			educationCounter++;
			goingToCollege = false;
		}

		if (
			currentAge >= 23 + educationCounter * 5 &&
			faker.datatype.boolean(0.1) &&
			educationCounter === 1
		) {
			yearsGraduateSchool.push(birthDate.getFullYear() + currentAge);
			educationCounter++;
			goingToCollege = false;
		}

		// Check job events
		if (
			currentAge >= 22 &&
			!currentJob &&
			!goingToCollege &&
			faker.datatype.boolean(0.8) &&
			jobCounter === 0
		) {
			currentJob = true;
			yearsStartJob.push(birthDate.getFullYear() + currentAge);
		}

		if (currentAge >= 23 && currentJob && faker.datatype.boolean(0.1)) {
			jobCounter++;
			yearsStartJob.push(birthDate.getFullYear() + currentAge);
		}

		// relationship events
		if (
			currentAge >= 20 &&
			faker.datatype.boolean(0.2) &&
			!currentRelationship
		) {
			lifeEvents.push({
				title: "Married",
				description: `Got married to ${faker.person.firstName()} ${faker.person.lastName()}`,
				date: getRandomDateFromYear(birthDate.getFullYear() + currentAge),
			});
			currentRelationship = true;
		}

		const childEvent = {
			title: "Had a child",
			description: `Had a child named ${faker.person.firstName()}`,
			date: getRandomDateFromYear(birthDate.getFullYear() + currentAge),
		};
		if (
			currentAge >= 22 &&
			currentAge <= 30 &&
			faker.datatype.boolean(0.15) &&
			currentRelationship
		) {
			lifeEvents.push(childEvent);
		}
		if (
			currentAge >= 31 &&
			currentAge <= 40 &&
			faker.datatype.boolean(0.05) &&
			currentRelationship
		) {
			lifeEvents.push(childEvent);
		}

		const petEvent = {
			title: "Adopted a pet",
			description: `Adopted a pet named ${faker.animal.dog()}`,
			date: getRandomDateFromYear(birthDate.getFullYear() + currentAge),
		};
		if (currentAge >= 20 && faker.datatype.boolean(0.075)) {
			lifeEvents.push(petEvent);
		}

		if (currentAge >= 30 && faker.datatype.boolean(0.05)) {
			lifeEvents.push(petEvent);
		}

		currentAge++;
	}

	const formattedYearsStartJob = formatYears(yearsStartJob);
	const formattedYearsGraduateSchool = formatYears(yearsGraduateSchool);
	const formattedPlacesLived = formatPlacesLived(placesLived);

	return {
		birthDate,
		lifeEvents,
		yearsStartJob: formattedYearsStartJob,
		yearsGraduateSchool: formattedYearsGraduateSchool,
		placesLived: formattedPlacesLived,
	};
};
