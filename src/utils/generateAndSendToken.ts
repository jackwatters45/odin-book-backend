import {
	sendResetPasswordEmail,
	sendVerificationEmail,
} from "../config/nodemailer";
import { sendResetPasswordSMS, sendVerificationSMS } from "../config/twilio";
import { IUser } from "../../types/IUser";
import generateToken from "../config/utils/generateToken";

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

	const { token, tokenExpires, code } = generateToken();
	user[tokenType].token = token;
	user[tokenType].tokenExpires = tokenExpires;
	user[tokenType].code = code;

	user[tokenType].type = method;

	try {
		await user.save();
	} catch (err) {
		console.error(err);
		throw new Error("Could not save token to user.");
	}

	try {
		if (method === "email") {
			const email = user.email;
			tokenType === "verification"
				? await sendVerificationEmail(email, code, token)
				: await sendResetPasswordEmail(email, code, token);
		} else if (method === "phoneNumber") {
			const phoneNumber = user.phoneNumber as string;
			tokenType === "verification"
				? await sendVerificationSMS(phoneNumber, code, token)
				: await sendResetPasswordSMS(phoneNumber, code, token);
		}
	} catch (err) {
		console.error(err);
		throw new Error("Could not send token to user.");
	}
};

export default generateAndSendToken;
