import { parsePhoneNumberFromString } from "libphonenumber-js";

const validateAndFormatPhoneNumber = (input: string) => {
	const phoneNumber = parsePhoneNumberFromString(input, "US");

	if (phoneNumber && phoneNumber.isValid()) {
		const formattedNumber = phoneNumber.format("E.164");

		console.log(`Stored phone number: ${formattedNumber}`);
		return formattedNumber;
	} else {
		console.error("The phone number is not valid.");
		return null;
	}
};

const validateAndFormatEmail = (input: string) => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	if (!emailRegex.test(input)) {
		console.error("The email is not valid.");
		return null;
	}

	const email = input.toLowerCase();
	console.log(`Stored email: ${email}`);

	return email;
};

export const getUsernameType = (input: string) => {
	return input.includes("@") ? "email" : "phoneNumber";
};

interface IValidateUsername {
	usernameType: "email" | "phoneNumber";
	formattedUsername: string | null;
}

const validateUsername = (input: string): IValidateUsername => {
	const usernameType = getUsernameType(input);
	const formattedUsername =
		usernameType === "email"
			? validateAndFormatEmail(input)
			: validateAndFormatPhoneNumber(input);

	return {
		usernameType,
		formattedUsername,
	};
};

export default validateUsername;
