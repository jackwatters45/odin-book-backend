import { ObjectId } from "mongoose";
import debug from "debug";

import Post from "../../../../src/models/post.model";
import User from "../../../../src/models/user.model";

import {
	getRandValuesFromArray,
	getRandomInt,
} from "../../utils/helperFunctions";
import { IUser } from "../../../../types/user";
import { AnyBulkWriteOperation } from "mongodb";

const log = debug("log:populatePosts");

const BATCH_SIZE = 100;

export const addSavedPostsToUser = async (
	userId: ObjectId,
	posts: ObjectId[],
): Promise<unknown> => {
	const numPosts = getRandomInt(20);
	const savedPosts = getRandValuesFromArray(posts, numPosts);
	return {
		updateOne: {
			filter: { _id: userId },
			update: { $addToSet: { savedPosts: { $each: savedPosts } } },
		},
	};
};

export const addSavedPosts = async (users: IUser[]) => {
	log("Adding saved posts to users...");
	const postIds = (await Post.find({}).select("_id").lean()).map(
		(post) => post._id,
	);

	const userUpdates: unknown[] = [];
	for (const user of users) {
		const update = await addSavedPostsToUser(user._id, postIds);
		userUpdates.push(update);
	}

	try {
		for (let i = 0; i < userUpdates.length; i += BATCH_SIZE) {
			const batch = userUpdates.slice(i, i + BATCH_SIZE);
			await User.bulkWrite(batch as AnyBulkWriteOperation[]);
		}
	} catch (error) {
		throw new Error(error.message);
	}
};
