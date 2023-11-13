import debug from "debug";
import { IUser } from "../../../../types/IUser";
import addFamilyMembers from "./addFamily";
import {
	addFriendRequestsReceived,
	addFriendRequestsSent,
	addFriends,
} from "./addFriends";
import addRelationshipStatus from "./addRelationship";

const log = debug("log:addFieldsThatRequireOtherUsers");

const addFieldsThatRequireOtherUsers = async (
	users: IUser[],
): Promise<IUser[]> => {
	log("Adding fields that require other users...");

	const usersWithFriends = await addFriends(users);

	await addFriendRequestsReceived(users);

	await addFriendRequestsSent(users);

	await addRelationshipStatus(users);

	await addFamilyMembers(users);

	log("Finished adding fields that require other users.");

	return usersWithFriends;
};

export default addFieldsThatRequireOtherUsers;

// const populateUsers = async (quantity = 1) => {
// 	log("Populating users...");
// 	const usersPromises: Promise<IUser>[] = [];
// 	for (let i = 0; i < quantity; i++) {
// 		usersPromises.push(createRandomUser());
// 	}

// 	log("Users have been populated successfully");

// 	return await Promise.all(usersPromises);
// };
