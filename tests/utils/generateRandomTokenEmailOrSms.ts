import { faker } from "@faker-js/faker";
import generateToken from "../../src/config/utils/generateToken";

type tokenType = "email" | "phoneNumber";

const generateRandomTokenEmailOrSms = (tokenType?: tokenType) => {
	const type: tokenType =
		tokenType || (faker.datatype.boolean(0.5) ? "email" : "phoneNumber");
	const { token, tokenExpires, code } = generateToken();

	return { token, tokenExpires, type, code };
};

export default generateRandomTokenEmailOrSms;
