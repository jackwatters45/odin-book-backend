import nodemailer from "nodemailer";
import {
	appUrl,
	corsOrigin,
	emailHost,
	emailPassword,
} from "../config/envVariables";
import Mail from "nodemailer/lib/mailer";
import debug from "debug";

const log = debug("log:email");

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: emailHost,
		pass: emailPassword,
	},
});

// TODO change to frontend url
const getVerificationLink = (token: string) =>
	`${appUrl}/auth/verify/link/${token}`;

export const getMailOptionsVerify = (
	email: string,
	code: string,
	token: string,
) => {
	return {
		from: emailHost,
		to: email,
		subject: "Verify your account",
		text: `Thank you for registering!

        Please confirm your email address using the following code:

        ${code}

        Alternatively, you can copy and paste the link below into your browser's address bar: ${getVerificationLink(
					token,
				)}

        After verification, you will be able to use all the features of our service. Your verification code expires in 15 minutes. If you did not request this verification code, please ignore this email.

        Thank you,
        The Odin Book Team`,
		html: `
    <h2>Thank you for registering!</h2>
    <p>Please confirm your email address using the following code:</p>
    <h1>${code}</h1>
    <p>Alternatively, click the link below:</p>
    <a href="${getVerificationLink(token)}">Click here to verify</a>
    <p>After verification, you will be able to use all the features of our service. Your verification code expires in 15 minutes. If you did not request this verification code, please ignore this email.</p>
    <p>Thank you,</p>
    <p>The Odin Book Team</p>
    `,
	};
};

const getResetPasswordLink = (token: string) =>
	`${corsOrigin}/recover/validate-link/${token}`;

export const getMailOptionsReset = (
	email: string,
	code: string,
	token: string,
) => {
	return {
		from: emailHost,
		to: email,
		subject: "Reset your password",
		text: `You are receiving this email because you (or someone else) requested the reset of the password for your account.

    We received a request to reset your Odin Book password.
		Enter the following password reset code:

		${code}

		Alternatively, you can directly change your password. Click the link below:

    ${getResetPasswordLink(token)}

    If you did not request this, please ignore this email and your password will remain unchanged.`,
		html: `
    <p>You are receiving this email because you (or someone else) requested the reset of the password for your account.</p>

		<p>We received a request to reset your Odin Book password.</p>
		<p>Enter the following password reset code:</p>

		<h2>${code}</h2>

		<p>Alternatively, you can directly change your password.</p>

		<button><a href="${getResetPasswordLink(token)}">Change password</a></button>
    `,
	};
};

export const sendEmail = async (mailOptions: Mail.Options) => {
	try {
		const info = await transporter.sendMail(mailOptions);
		log("Email sent: " + info.response);
	} catch (error) {
		log(error);
	}
};

export const sendVerificationEmail = async (
	email: string,
	code: string,
	token: string,
) => {
	const mailOptions = getMailOptionsVerify(email, code, token);
	await sendEmail(mailOptions);
};

export const sendResetPasswordEmail = async (
	email: string,
	code: string,
	token: string,
) => {
	const mailOptions = getMailOptionsReset(email, code, token);
	await sendEmail(mailOptions);
};

// TODO verify domain: Ensure that your domain is properly verified and authenticated with Sender Policy Framework (SPF), DomainKeys Identified Mail (DKIM), and Domain-Based Message Authentication, Reporting, and Conformance (DMARC) records. This will help to prove the email was not altered during transit and that it does originate from your domain.
