import debug from "debug";

import Post from "../../../src/models/post.model";
import User, { IUser } from "../../../src/models/user.model";
import { getRandomInt } from "../utils/helperFunctions";
import { getPostData, getSharedPostData } from "./utils/getPostData";
import addReactions from "./utils/addReactions";
import addComments from "./utils/addComments";
import { IReaction } from "../../../src/models/reaction.model";
import { Schema } from "mongoose";

const log = debug("log:populatePosts");

export const createPost = async (
	user: IUser,
	users: IUser[],
	sharedFrom: boolean,
) => {
	const postData = sharedFrom
		? await getPostData(user)
		: await getSharedPostData(user);

	const post = new Post(postData);
	await post.save();

	if (post.taggedUsers && post.taggedUsers.length > 0) {
		await User.updateMany(
			{ _id: { $in: post.taggedUsers } },
			{ $addToSet: { taggedPosts: post._id } },
		);
	}

	post.reactions = (await addReactions(post, users, 20, "post")) as unknown as (
		| Schema.Types.ObjectId
		| IReaction
	)[];

	post.comments = await addComments({ users, post });

	await post.save();

	return post;
};

interface createPostsParams {
	user: IUser;
	users: IUser[];
	sharedFrom?: boolean;
}

export const createPosts = async ({
	user,
	users,
	sharedFrom = false,
}: createPostsParams) => {
	const quantity = getRandomInt(sharedFrom ? 5 : 20);

	log(
		`Creating ${quantity} ${sharedFrom && "shared"} posts for user ${user._id}`,
	);

	for (let i = 0; i < quantity; i++) {
		await createPost(user, users, sharedFrom);
	}
};

export const createUsersPosts = async (
	users: IUser[],
	sharedFrom?: boolean,
) => {
	log("Creating posts...");

	await Promise.all(
		users.map((user) => createPosts({ user, users, sharedFrom })),
	);

	log("Posts have been created successfully");
};

export const createUsersPostsSharedFrom = async (users: IUser[]) => {
	log("Creating shared posts...");

	await Promise.all(
		users.map((user) => createPosts({ user, users, sharedFrom: true })),
	);

	log("Shared posts have been created successfully");
};
