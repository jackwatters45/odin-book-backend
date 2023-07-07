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
}

const generateUser = (usernameType?: usernameType): TestUser => ({
	firstName: faker.person.firstName(),
	lastName: faker.person.lastName(),
	username: generateUsername(usernameType),
	password: generatePassword(),
	birthday: faker.date.past().toISOString(),
	pronouns: "she/her",
});

export default generateUser;
