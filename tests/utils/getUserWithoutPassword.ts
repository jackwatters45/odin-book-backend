import { log } from "console";
import { IUser } from "../../src/models/user-model/user.model";

const getUserWithoutPassword = (user: IUser) => {
	const { password: _, ...userWithoutPassword } = user.toObject();
	return userWithoutPassword;
};

export default getUserWithoutPassword;
