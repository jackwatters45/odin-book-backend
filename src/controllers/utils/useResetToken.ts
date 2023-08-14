import { IUser } from "../../../types/IUser";

const useResetToken = (type: "verification" | "resetPassword") => {
	return async (user: IUser) => {
		user.verification.token = undefined;
		user.verification.tokenExpires = undefined;
		user.verification.code = undefined;

		await user.save();
	};
};

export default useResetToken;
