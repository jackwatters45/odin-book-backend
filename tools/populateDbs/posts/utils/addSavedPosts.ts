import { ObjectId } from "mongoose";

import { IUser } from "../../../../src/models/user-model/user.model";
import {
	getRandValuesFromArray,
	getRandomInt,
} from "../../utils/populateHelperFunctions";

export const addSavedPostsToUser = async (user: IUser, posts: ObjectId[]) => {
	const numPosts = getRandomInt(posts.length) / 2 + 3;
	user.savedPosts = getRandValuesFromArray(posts, numPosts);

	try {
		return await user.save();
	} catch (error) {
		throw new Error(error);
	}
};

export const addSavedPosts = async (users: IUser[], posts: ObjectId[]) => {
	try {
		return await Promise.all(
			users.map((user) => addSavedPostsToUser(user, posts)),
		);
	} catch (error) {
		throw new Error(error);
	}
};
