import { generateTokenEmail } from "../../src/config/nodemailer";
import { generateTokenSMS } from "../../src/config/twilio";
import { faker } from "@faker-js/faker";

type tokenType = "email" | "phoneNumber";

const generateRandomTokenEmailOrSms = (tokenType?: tokenType) => {
	const type: tokenType =
		tokenType || faker.datatype.boolean(0.5) ? "email" : "phoneNumber";
	const { token, tokenExpires } =
		type === "email" ? generateTokenEmail() : generateTokenSMS();

	return { token, tokenExpires, type };
};

export default generateRandomTokenEmailOrSms;
