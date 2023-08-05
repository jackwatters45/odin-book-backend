import debug from "debug";
import { faker } from "@faker-js/faker";
import { ObjectId } from "mongoose";

import Post, { IPost } from "../../../src/models/post.model";
import User from "../../../src/models/user-model/user.model";
import { getRandValueFromArrayOfObjs } from "../utils/populateHelperFunctions";
import ICreatePostOptions from "../../../types/ICreatePostOptions";
import getPostData from "./utils/getPostData";
import addReactions from "./utils/addReactions";
import addComments from "./utils/addComments";

const log = debug("log:populatePosts");

export const createRandomPost = async (options?: ICreatePostOptions) => {
	const users = (await User.find().select("_id")).map(
		(user) => user._id,
	) as ObjectId[];

	const post = new Post(getPostData(users, options));

	try {
		if (options?.includeReactions) {
			post.reactions = (await addReactions(
				post._id,
				users,
				5,
			)) as unknown as ObjectId[];
		}

		// defaults to true
		if (options?.includeComments !== false) {
			post.comments = await addComments(users, post._id);
		}

		const posts = await Post.find().select("_id");
		if (posts.length && faker.datatype.boolean(0.1)) {
			post.sharedFrom = getRandValueFromArrayOfObjs(posts, "_id");
		}

		const savedPost = await post.save();
		post;
		log(`Post ${savedPost._id} created!`);
		return (await savedPost.save()) as IPost;
	} catch (err) {
		throw new Error("Error creating post");
	}
};

export const createPosts = async (
	quantity = 1,
	options?: ICreatePostOptions,
) => {
	const postsPromises: Promise<IPost>[] = [];
	for (let i = 0; i < quantity; i++) {
		postsPromises.push(createRandomPost(options));
	}

	const posts = await Promise.all(postsPromises);

	const sortedPosts = posts.sort((a, b) => {
		if (!a.createdAt || !b.createdAt) return 0;
		return b.createdAt.getTime() - a.createdAt.getTime();
	});

	return sortedPosts;
};
