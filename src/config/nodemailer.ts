import nodemailer from "nodemailer";
import { appUrl, emailHost, emailPassword } from "../config/envVariables";
import Mail from "nodemailer/lib/mailer";
import { v4 as uuidv4 } from "uuid";

const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: emailHost,
		pass: emailPassword,
	},
});

export const generateTokenEmail = () => ({
	token: uuidv4(),
	tokenExpires: Date.now() + 1000 * 60 * 15, // 15 minutes
});

const getVerificationLink = (verificationToken: string) =>
	`${appUrl}/verify?token=${verificationToken}`;

export const getMailOptionsVerify = (
	email: string,
	verificationCode: string,
) => {
	return {
		from: emailHost,
		to: email,
		subject: "Verify your account",
		text: `Thank you for registering!

        Please confirm your email address using the following code:

        ${verificationCode}

        Alternatively, you can copy and paste the link below into your browser's address bar: ${getVerificationLink(
					verificationCode,
				)}

        After verification, you will be able to use all the features of our service. Your verification code expires in 15 minutes. If you did not request this verification code, please ignore this email.

        Thank you,
        YourWebsite Team`,
		html: `
    <h2>Thank you for registering!</h2>
    <p>Please confirm your email address using the following code:</p>
    <h1>${verificationCode}</h1>
    <p>Alternatively, click the link below:</p>
    <a href="${getVerificationLink(verificationCode)}">Click here to verify</a>
    <p>After verification, you will be able to use all the features of our service. Your verification code expires in 15 minutes. If you did not request this verification code, please ignore this email.</p>
    <p>Thank you,</p>
    <p>YourWebsite Team</p>
    `,
	};
};

const getResetPasswordLink = (resetPasswordCode: string) =>
	`${appUrl}/reset-password?token=${resetPasswordCode}`;

export const getMailOptionsReset = (
	email: string,
	resetPasswordCode: string,
) => {
	return {
		from: emailHost,
		to: email,
		subject: "Reset your password",
		text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.

    Please click on the following link, or paste this into your browser to complete the process:

    ${getResetPasswordLink(resetPasswordCode)}

    If you did not request this, please ignore this email and your password will remain unchanged.`,
		html: `
    <h2>You are receiving this email because you (or someone else) have requested the reset of the password for your account.</h2>
    <p>Please click on the following link, or paste this into your browser to complete the process:</p>
    <a href="${getResetPasswordLink(resetPasswordCode)}">${getResetPasswordLink(
			resetPasswordCode,
		)}</a>
    <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
    `,
	};
};

export const sendEmail = async (mailOptions: Mail.Options) => {
	try {
		const info = await transporter.sendMail(mailOptions);
		console.log("Email sent: " + info.response);
	} catch (error) {
		console.log(error);
	}
};

export const sendVerificationEmail = async (
	email: string,
	verificationCode: string,
) => {
	const mailOptions = getMailOptionsVerify(email, verificationCode);
	await sendEmail(mailOptions);
};

export const sendResetPasswordEmail = async (
	email: string,
	resetPasswordCode: string,
) => {
	const mailOptions = getMailOptionsReset(email, resetPasswordCode);
	await sendEmail(mailOptions);
};

// TODO verify domain: Ensure that your domain is properly verified and authenticated with Sender Policy Framework (SPF), DomainKeys Identified Mail (DKIM), and Domain-Based Message Authentication, Reporting, and Conformance (DMARC) records. This will help to prove the email was not altered during transit and that it does originate from your domain.
