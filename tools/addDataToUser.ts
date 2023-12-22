import { configDb, disconnectFromDatabase } from "../src/config/database";
import User, { IUser } from "../src/models/user.model";
import { addFriendsAndRequests } from "./populateDbs/users/usersReliantFields/addFriends";

const createFakeUser = async (id: string) => {
	await configDb();

	const user = (await User.findById(id)) as IUser;

	await addFriendsAndRequests([user], true);

	await disconnectFromDatabase();
};

createFakeUser("65261430a93bbe7662c9056f").catch(console.error);
