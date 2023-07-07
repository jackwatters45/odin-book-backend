import { faker } from "@faker-js/faker";

export type usernameType = "email" | "phoneNumber";

// returns a valid email or phone number as username
export const generateUsername = (usernameType?: usernameType): string => {
	const type =
		usernameType || faker.datatype.boolean(0.5) ? "email" : "phoneNumber";
	return type === "email"
		? faker.internet.email()
		: faker.phone.number("+1##########");
};
