import { faker } from "@faker-js/faker";

export type usernameType = "email" | "phoneNumber";

export const generateUsername = (usernameType?: usernameType): string => {
	const type =
		usernameType || (faker.datatype.boolean(0.5) ? "email" : "phoneNumber");

	return type === "email"
		? faker.internet.email()
		: faker.phone.number("+1##########");
};
