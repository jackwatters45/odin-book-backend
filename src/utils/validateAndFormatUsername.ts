import { parsePhoneNumberFromString } from "libphonenumber-js";
import debug from "debug";
import { nodeEnv } from "../config/envVariables";

const log = debug("log:validateAndFormatUsername");

export const validateAndFormatPhoneNumber = (input: string) => {
	const phoneNumber = parsePhoneNumberFromString(input, "US");

	if (nodeEnv === "test") {
		// log("Test env detected. Skipping phone number validation.");
		return input;
	} else if (phoneNumber && phoneNumber.isValid()) {
		const formattedNumber = phoneNumber?.format("E.164");
		return formattedNumber;
	} else {
		console.error("The phone number is not valid.", input);
		return null;
	}
};

const validateAndFormatEmail = (input: string) => {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	if (!emailRegex.test(input)) {
		console.error("The email is not valid.", input);
		return null;
	}

	const email = input.toLowerCase();

	return email;
};

export const getUsernameType = (input: string) => {
	return input.includes("@") ? "email" : "phoneNumber";
};

type UsernameType = "email" | "phoneNumber";

interface IValidateUsername {
	usernameType: UsernameType;
	formattedUsername: string | null;
}

const validateAndFormatUsername = (
	input: string,
	type?: UsernameType,
): IValidateUsername => {
	const usernameType = type ?? getUsernameType(input);
	const formattedUsername =
		usernameType === "email"
			? validateAndFormatEmail(input)
			: validateAndFormatPhoneNumber(input);

	return {
		usernameType,
		formattedUsername,
	};
};

export default validateAndFormatUsername;
