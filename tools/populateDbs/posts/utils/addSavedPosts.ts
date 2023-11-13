import { ObjectId } from "mongoose";
import debug from "debug";

import Post from "../../../../src/models/post.model";
import User from "../../../../src/models/user.model";

import {
	getRandValuesFromArray,
	getRandomInt,
} from "../../utils/populateHelperFunctions";
import { IUser } from "../../../../types/IUser";

const log = debug("log:populatePosts");

export const addSavedPostsToUser = async (
	userId: ObjectId,
	posts: ObjectId[],
) => {
	const numPosts = getRandomInt(10);
	const savedPosts = getRandValuesFromArray(posts, numPosts);

	try {
		return await User.findByIdAndUpdate(userId, {
			$addToSet: { savedPosts: { $each: savedPosts } },
		});
	} catch (error) {
		throw new Error(error);
	}
};

export const addSavedPosts = async (users: IUser[]) => {
	log("Adding saved posts to users...");

	const postIds = (await Post.find({}).select("_id")).map(
		(post) => post._id,
	) as ObjectId[];

	try {
		return await Promise.all(
			users.map((user) => addSavedPostsToUser(user._id, postIds)),
		);
	} catch (error) {
		throw new Error(error);
	}
};
