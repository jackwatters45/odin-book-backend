import { faker } from "@faker-js/faker";

export const generatePassword = (): string => {
	const specialChars = "!@#$%^&*()";
	const randomNumber = faker.string.numeric({ length: { min: 1, max: 9 } });
	const randomUpperCaseLetter = faker.string.alpha({
		length: 1,
		casing: "upper",
	});
	const randomLowerCaseLetter = faker.string.alpha({
		length: 1,
		casing: "lower",
	});
	const randomSpecialChar =
		specialChars[faker.number.int({ min: 0, max: specialChars.length - 1 })];

	let password =
		randomUpperCaseLetter +
		randomLowerCaseLetter +
		randomNumber +
		randomSpecialChar;

	// Add random alphanumeric characters until the password length is 10
	while (password.length < 10) {
		password += faker.string.alphanumeric(1);
	}

	password = password
		.split("")
		.sort(() => 0.5 - Math.random())
		.join("");

	return password;
};

export const generateInvalidPassword = (): string =>
	faker.internet.password({
		length: 8,
		memorable: false,
		pattern: /[a-z]/,
	});
