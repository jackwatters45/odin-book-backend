import { faker } from "@faker-js/faker";

import { EducationData } from "../../../../types/user";
import {
	getRandValueFromArray,
	getRandValuesFromArray,
} from "../../utils/helperFunctions";
import { fieldsOfStudy } from "../utils/userOptions";

const createRandomPrimaryEducationData = (
	birthday: Date,
): Partial<EducationData> => {
	return {
		type: "high school",
		school: `${faker.company.name()} High School`,
		graduated: faker.datatype.boolean(0.95),
		description: faker.lorem.paragraph(),
		startDay: faker.date.past().getDate().toString(),
		startMonth: faker.datatype.boolean() ? "8" : "9",
		startYear: (birthday.getFullYear() + 14).toString(),
		endDay: faker.date.past().getDate().toString(),
		endMonth: faker.datatype.boolean() ? "5" : "6",
		endYear: (birthday.getFullYear() + 18).toString(),
	};
};

const createRandomSecondaryEducationData = (
	birthday: Date,
): Partial<EducationData> => {
	const { field, concentrations } = getRandValueFromArray(fieldsOfStudy);
	const startYear = faker.datatype.boolean()
		? (birthday.getFullYear() + 18).toString()
		: (birthday.getFullYear() + 19).toString();

	return {
		type: "college",
		school: `${faker.company.name()} University`,
		degree: field,
		graduated: faker.datatype.boolean(0.9),
		description: faker.lorem.paragraph(),
		concentrations: getRandValuesFromArray(concentrations),
		attendedFor: faker.datatype.boolean(0.8)
			? "undergraduate"
			: "graduate school",
		startDay: faker.date.past().getDate().toString(),
		startMonth: faker.datatype.boolean() ? "8" : "9",
		startYear,
		endDay: faker.date.past().getDate().toString(),
		endMonth: faker.date.past().getMonth().toString(),
		endYear: (Number(startYear) + 4).toString(),
	};
};

const createEducation = (birthday: Date) => {
	const education: Partial<EducationData>[] = [];

	if (faker.datatype.boolean(0.95)) {
		education.push(createRandomPrimaryEducationData(birthday));
	}

	if (faker.datatype.boolean(0.9)) {
		education.push(createRandomSecondaryEducationData(birthday));
	}

	return { education };
};

export default createEducation;
