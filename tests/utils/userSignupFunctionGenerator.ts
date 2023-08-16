import debug from "debug";

import User from "../../src/models/user.model";
import { IUser } from "../../types/IUser";
import generateUser from "./generateUser";
import { usernameType } from "./generateUsername";
import { getUsernameType } from "../../src/controllers/utils/validateAndFormatUsername";

const log = debug("log:userSignupFunctionGenerator");

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
