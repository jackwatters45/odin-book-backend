import { faker } from "@faker-js/faker";
import { generatePassword } from "./generatePassword";
import { generateUsername, usernameType } from "./generateUsername";

export interface TestUser {
	firstName: string;
	lastName: string;
	username: string;
	password: string;
	birthday: string;
	pronouns: string;
	gender?: string;
	userType: "user" | "admin";
}

interface generateUserOptions {
	usernameType?: usernameType;
	birthdayRef?: Date;
	pronouns?: string;
	gender?: string;
}

const generateUser = (options?: generateUserOptions): TestUser => {
	const usernameType = options?.usernameType || undefined;
	const refDate = options?.birthdayRef || new Date(2000, 0, 1);
	return {
		firstName: faker.person.firstName(),
		lastName: faker.person.lastName(),
		username: generateUsername(usernameType),
		password: generatePassword(),
		birthday: faker.date.past({ refDate }).toISOString(),
		pronouns: options?.pronouns || "she/her",
		gender: options?.gender || undefined,
		userType: "user",
	};
};

export default generateUser;
