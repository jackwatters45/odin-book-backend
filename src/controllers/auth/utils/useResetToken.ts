import { IUser } from "../../../models/user.model";

const useResetToken = (
	type: "verification" | "resetPassword",
): ((user: IUser) => Promise<void>) => {
	return async (user: IUser) => {
		user[type].token = undefined;
		user[type].tokenExpires = undefined;
		user[type].code = undefined;

		await user.save();
	};
};

export default useResetToken;
