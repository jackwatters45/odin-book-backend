import twilio from "twilio";
import {
	appUrl,
	twilioAccountSid,
	twilioAuthToken,
	twilioPhoneNumber,
} from "./envVariables";

const client = twilio(twilioAccountSid, twilioAuthToken);

export const generateTokenSMS = () => ({
	token: Math.floor(100000 + Math.random() * 900000).toString(),
	tokenExpires: Date.now() + 15 * 60 * 1000,
});

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
	`${appUrl}/verify?token=${verificationToken}`;

const getVerificationMessage = (code: string) => {
	return `Your verification code is ${code}. 
  
  You can also click on the following link to verify your account: ${getVerificationLink(
		code,
	)}

  It expires in 15 minutes. If you did not request this verification code, please ignore this message.`;
};

const getResetPasswordLink = (resetPasswordCode: string) =>
	`${appUrl}/reset-password?token=${resetPasswordCode}`;

const getResetPasswordMessage = (resetPasswordCode: string) => {
	return `You are receiving this message because you (or someone else) have requested the reset of the password for your account.

  Please click on the following link, or paste this into your browser to complete the process:

  ${getResetPasswordLink(resetPasswordCode)}

  If you did not request this, please ignore this message and your password will remain unchanged.`;
};

export const sendVerificationSMS = async (
	phoneNumber: string,
	verificationCode: string,
) => {
	const message = getVerificationMessage(verificationCode);
	await createTwilioMessage(phoneNumber, message);
};

export const sendResetPasswordSMS = async (
	phoneNumber: string,
	resetPasswordCode: string,
) => {
	const message = getResetPasswordMessage(resetPasswordCode);
	await createTwilioMessage(phoneNumber, message);
};
