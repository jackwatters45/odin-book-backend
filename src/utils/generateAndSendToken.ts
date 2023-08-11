import {
	generateTokenEmail,
	sendResetPasswordEmail,
	sendVerificationEmail,
} from "../config/nodemailer";
import {
	generateTokenSMS,
	sendResetPasswordSMS,
	sendVerificationSMS,
} from "../config/twilio";
import { IUser } from "../../types/IUser";

const generateAndSendToken = async (
	user: IUser,
	tokenType: "verification" | "resetPassword",
	method: "email" | "phoneNumber",
) => {
	if (method === "phoneNumber" && !user.phoneNumber) {
		throw new Error("User does not have a phone number.");
	} else if (method === "email" && !user.email) {
		throw new Error("User does not have an email address.");
	}

	const { token, tokenExpires } =
		method === "email" ? generateTokenEmail() : generateTokenSMS();
	user[tokenType].token = token;
	user[tokenType].tokenExpires = tokenExpires;
	user[tokenType].type = method;

	try {
		await user.save();
	} catch (err) {
		console.error(err);
		throw new Error("Could not save token to user.");
	}

	try {
		if (method === "email") {
			tokenType === "verification"
				? await sendVerificationEmail(user.email, token)
				: await sendResetPasswordEmail(user.email, token);
		} else if (method === "phoneNumber") {
			const phoneNumber = user.phoneNumber as string;
			tokenType === "verification"
				? await sendVerificationSMS(phoneNumber, token)
				: await sendResetPasswordSMS(phoneNumber, token);
		}
	} catch (err) {
		console.error(err);
		throw new Error("Could not send token to user.");
	}
};

export default generateAndSendToken;
