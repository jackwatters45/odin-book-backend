import twilio from "twilio";
import {
	appUrl,
	twilioAccountSid,
	twilioAuthToken,
	twilioPhoneNumber,
} from "./envVariables";

const client = twilio(twilioAccountSid, twilioAuthToken);

const createTwilioMessage = async (to: string, body: string) => {
	try {
		const message = await client.messages.create({
			body,
			from: twilioPhoneNumber,
			to,
		});

		return message;
	} catch (err) {
		console.error(err);
	}
};

const getVerificationLink = (verificationToken: string) =>
	`${appUrl}/verify/link/${verificationToken}`;

const getVerificationMessage = (code: string, token: string) => {
	return `Your verification code is ${code}. 

	You can also click on the following link to verify your account: ${getVerificationLink(
		token,
	)}

	It expires in 15 minutes. If you did not request this verification code, please ignore this message.`;
};

const getResetPasswordLink = (token: string) =>
	`${appUrl}/reset-password/${token}`;

const getResetPasswordMessage = (code: string, token: string) => {
	return `You are receiving this message because you (or someone else) requested the reset of the password for your account.

	Your code is ${code}. 
  
	You can also click on the following link to reset your password: ${getResetPasswordLink(
		token,
	)}


  If you did not request this, please ignore this message and your password will remain unchanged.`;
};

export const sendVerificationSMS = async (
	phoneNumber: string,
	code: string,
	token: string,
) => {
	const message = getVerificationMessage(code, token);
	await createTwilioMessage(phoneNumber, message);
};

export const sendResetPasswordSMS = async (
	phoneNumber: string,
	code: string,
	token: string,
) => {
	const message = getResetPasswordMessage(code, token);
	try {
		await createTwilioMessage(phoneNumber, message);
	} catch (err) {
		console.error(err);
	}
};
