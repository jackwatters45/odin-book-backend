import User, { IUser } from "../../src/models/user-model/user.model";
import generateUser from "./generateUser";
import { usernameType } from "./generateUsername";

export const userSignupFunctionGenerator = () => {
	return async (
		otherAttributes?: Partial<IUser>,
		usernameType?: usernameType,
	) => {
		const { username, ...userData } = generateUser(usernameType);
		const idType = username.includes("@") ? "email" : "phoneNumber";

		try {
			const user = await User.create({
				...userData,
				[idType]: username,
				...otherAttributes,
			});

			return { user, password: userData.password };
		} catch (err) {
			console.error(err);
			throw new Error(`User not created: ${err.message}`);
		}
	};
};
