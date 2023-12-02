import debug from "debug";

import { createRandomUser } from "./populateDbs/users";
import {
	getRandValuesFromArray,
	getRandomInt,
} from "./populateDbs/utils/helperFunctions";
import Post from "../src/models/post.model";
import User, { IUser } from "../src/models/user.model";
import { ObjectId } from "mongoose";
import { createPosts } from "./populateDbs/posts";
import { addRelationshipStatus } from "./populateDbs/users/usersReliantFields/addRelationship";
import { AddFamilyMembersToUser } from "./populateDbs/users/usersReliantFields/addFamily";
import { addFriendsAndRequests } from "./populateDbs/users/usersReliantFields/addFriends";

const log = debug("log:createFakeUser");

const addUserSocialData = async (user: IUser) => {
	log("Adding fields that require other users...");

	await addFriendsAndRequests([user]);

	await addRelationshipStatus(user);
	log("addRelationshipStatus");

	await AddFamilyMembersToUser(user);
	log("AddFamilyMembersToUser");

	log("Finished adding fields that require other users.");
};

const addUserSavedPosts = async (userId: ObjectId) => {
	const posts = await Post.find({}).select("_id");
	const numPosts = getRandomInt(30);
	const savedPosts = getRandValuesFromArray(posts, numPosts);

	try {
		return await User.findByIdAndUpdate(userId, {
			$addToSet: { savedPosts: { $each: savedPosts } },
		});
	} catch (error) {
		throw new Error(error);
	}
};

const createFakeUser = async () => {
	const user = await createRandomUser();

	await addUserSocialData(user);

	const userWithSocialData = (await User.findById(user._id).lean()) as IUser;

	const users = await User.find({}).select("_id");

	await createPosts({ user: userWithSocialData, users });

	const userWithSavedPosts = await addUserSavedPosts(userWithSocialData._id);

	return userWithSavedPosts;
};

export default createFakeUser;
