import { configDb, disconnectFromDatabase } from "../src/config/database";
import User from "../src/models/user.model";

const createFakeUser = async (id: string) => {
	await configDb();

	await User.findByIdAndUpdate(id, {
		familyMembers: [],
	});

	await disconnectFromDatabase();
};

createFakeUser("65261430a93bbe7662c9056f").catch(console.error);
