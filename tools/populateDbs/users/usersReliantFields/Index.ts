import debug from "debug";
import addFamilyMembers from "./addFamily";

import { addRelationshipStatuses } from "./addRelationship";
import { addFriendsAndRequests } from "./addFriends";
import { addBirthdayNotificationsToAllUsers } from "./addBirthdayNotifications";
import { IUser } from "../../../../src/models/user.model";

const log = debug("log:addFieldsThatRequireOtherUsers");

const addFieldsThatRequireOtherUsers = async (
	users: IUser[],
): Promise<void> => {
	log("Adding fields that require other users...");

	await addFriendsAndRequests(users);

	await addBirthdayNotificationsToAllUsers(users);

	await addRelationshipStatuses(users);

	await addFamilyMembers(users);

	log("Finished adding fields that require other users.");

	log("Finished populating users");
};

export default addFieldsThatRequireOtherUsers;
