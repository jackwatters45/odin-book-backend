import { log } from "console";
import { IUser } from "../../types/IUser";

const getUserWithoutPassword = (user: IUser) => {
	const { password: _, ...userWithoutPassword } = user.toObject();
	return userWithoutPassword;
};

export default getUserWithoutPassword;
