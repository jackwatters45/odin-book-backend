import debug from "debug";
import { ObjectId } from "mongoose";

import Post, { IPost } from "../../../src/models/post.model";
import User from "../../../src/models/user.model";
import { getRandomInt } from "../utils/populateHelperFunctions";
import { IUser } from "../../../types/IUser";
import getPostData from "./utils/getPostData";
import addReactions from "./utils/addReactions";
import addComments from "./utils/addComments";

const log = debug("log:populatePosts");

const createPost = async (user: IUser, userIds: ObjectId[]) => {
	const postData = await getPostData(user);

	log("postData", postData.author);
	const post = new Post(postData);

	log("post", post);
	await post.save();

	if (post.taggedUsers && post.taggedUsers.length > 0) {
		await Promise.all(
			post.taggedUsers.map((userId) => {
				try {
					return User.findByIdAndUpdate(userId, {
						$addToSet: { taggedPosts: post._id },
					});
				} catch (err) {
					log(err);
				}
			}),
		);
	}

	post.reactions = await addReactions(post._id, userIds, 20);

	post.comments = await addComments(userIds, {
		_id: post._id,
		createdAt: post.createdAt,
	});

	await post.save();

	return post;
};

const createPosts = async (user: IUser, userIds: ObjectId[], quantity = 1) => {
	const postsPromises: Promise<IPost>[] = [];
	for (let i = 0; i < quantity; i++) {
		postsPromises.push(createPost(user, userIds));
	}
	return await Promise.all(postsPromises);
};

const createUsersPosts = async (users: IUser[]) => {
	log("Creating posts...");

	const quantity = getRandomInt(20);
	const userIds = users.map((user) => user._id) as ObjectId[];

	const posts = users.map(async (user) => {
		return createPosts(user, userIds, quantity);
	});

	log("Posts have been created successfully");

	return await Promise.all(posts);
};

export default createUsersPosts;
