import debug from "debug";
import { faker } from "@faker-js/faker";

import Post, { IPost } from "../../../src/models/post.model";
import User, { IUser } from "../../../src/models/user-model/user.model";
import Comment, { reactionTypes } from "../../../src/models/comment.model";

import {
	getComments,
	getRandValueFromArray,
	getRandValueFromArrayObjs,
	getRandValuesFromArrayObjs,
	getRandomInt,
} from "../utils/populateHelperFunctions";
import { feelings } from "./utils/postOptions";
import { ObjectId } from "mongoose";

const log = debug("log");

const getPostData = (users: IUser[]) => {
	const author = getRandValueFromArrayObjs(users);
	const likes = getRandValuesFromArrayObjs(users, 20);
	const taggedUsers = getRandValuesFromArrayObjs(users, 5);

	const postData = {
		content: faker.lorem.paragraph(),
		published: faker.datatype.boolean(0.8),
		feeling: faker.datatype.boolean(0.2)
			? getRandValueFromArray(feelings)
			: null,
		media: faker.datatype.boolean(0.25) ? faker.image.urlLoremFlickr() : null,
		checkIn: faker.datatype.boolean(0.1)
			? {
					longitude: faker.location.longitude(),
					latitude: faker.location.latitude(),
			  }
			: null,
		lifeEvent: faker.datatype.boolean(0.1)
			? {
					title: faker.lorem.sentence(),
					description: faker.lorem.paragraph(),
					date: faker.date.past(),
			  }
			: null,
		author,
		likes,
		taggedUsers,
	};

	return postData;
};

interface ICreatePostOptions {
	author?: ObjectId;
	includeComments?: boolean;
	includeReactions?: boolean;
}

export const createPost = async (options?: ICreatePostOptions) => {
	const users = await User.find().select("_id");

	const postData = getPostData(users);
	const post = new Post(postData);

	if (options?.author) post.author = options.author;

	const savedPost = await post.save();

	const includeComments = options?.includeComments !== false;
	if (includeComments) {
		const commentData = getComments(users, 10, savedPost._id);
		const commentDocs = commentData.map((data) => {
			const comment = new Comment(data);

			const numReactions = getRandomInt(5) || 1;
			const usersReacting = getRandValuesFromArrayObjs(users, numReactions);

			const reactions = usersReacting.map((user) => ({
				user: user._id,
				type: getRandValueFromArray(reactionTypes),
			}));

			comment.reactions = reactions;

			return comment;
		});
		const savedComments = await Promise.all(
			commentDocs.map((comment) => comment.save()),
		);

		savedPost.comments = savedComments.map((comment) => comment._id);
	}

	const posts = await Post.find().select("_id");

	if (posts.length && faker.datatype.boolean(0.1)) {
		const sharedFrom = getRandValueFromArray(posts);
		savedPost.sharedFrom = sharedFrom._id;
	}
	await savedPost.save();

	log(`Post ${savedPost._id} created!`);
	return savedPost;
};

export const createPosts = async (
	quantity = 1,
	options?: ICreatePostOptions,
) => {
	const posts: IPost[] = [];
	for (let i = 0; i < quantity; i++) {
		const post = (await createPost(options)) as IPost;
		posts.push(post);
	}
	return posts;
};
