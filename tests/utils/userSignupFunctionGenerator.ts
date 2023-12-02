import User, { IUser } from "../../src/models/user.model";
import generateUser from "./generateUser";
import { usernameType } from "./generateUsername";
import { getUsernameType } from "../../src/utils/validateAndFormatUsername";

export const userSignupFunctionGenerator = () => {
	return async (
		otherAttributes?: Partial<IUser>,
		usernameType?: usernameType,
	) => {
		const { username, ...userData } = generateUser({ usernameType });
		const idType = getUsernameType(username);

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
