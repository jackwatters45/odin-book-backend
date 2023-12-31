import User from "../../src/models/user.model";
import { configDb, disconnectFromDatabase } from "../../src/config/database";
import { populateUsers } from "./users";
import addFieldsThatRequireOtherUsers from "./users/usersReliantFields/Index";
import { createUsersPosts, createUsersPostsSharedFrom } from "./posts";
import { addSavedPosts } from "./posts/utils/addSavedPosts";
import { removePostsWithRemovedAuthors } from "./utils/removePostsWithRemovedAuthors";
import { removeUserDataThatNoLongerExists } from "./utils/removeFriendsThatNoLongerExist";
import clearDatabase from "./utils/clearDatabase";
import readNotificationsOlderThanTwoWeeks from "./utils/readNotificationsOlderThanTwoWeeks";

const run = async () => {
	await configDb();

	await clearDatabase();
	await removeUserDataThatNoLongerExists();
	await removePostsWithRemovedAuthors();

	await populateUsers(1000);

	const users = await User.find({}).select(
		"friends friendRequestsReceived friendRequestsSent birthday relationshipStatus familyMembers createdAt",
	);

	await addFieldsThatRequireOtherUsers(users);

	await createUsersPosts(users);

	await createUsersPostsSharedFrom(users);

	await addSavedPosts(users);

	await readNotificationsOlderThanTwoWeeks();

	await disconnectFromDatabase();
};

run().catch(console.error);
