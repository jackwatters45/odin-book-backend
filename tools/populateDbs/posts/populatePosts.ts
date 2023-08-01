import debug from "debug";
import { faker } from "@faker-js/faker";

import Post, { IPost } from "../../../src/models/post.model";
import User, { IUser } from "../../../src/models/user-model/user.model";
import Comment from "../../../src/models/comment.model";
import Reaction, { reactionTypes } from "../../../src/models/reaction.model";

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

interface ICreatePostOptions {
	author?: ObjectId;
	includeComments?: boolean;
	includeReactions?: boolean;
	allPublished?: boolean;
}

const getPostData = (users: IUser[], options?: ICreatePostOptions) => {
	const author = getRandValueFromArrayObjs(users);
	const likes = getRandValuesFromArrayObjs(users, 20);
	const taggedUsers = getRandValuesFromArrayObjs(users, 5);

	const postData = {
		content: faker.lorem.paragraph(),
		published: options?.allPublished ? true : faker.datatype.boolean(0.8),
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

const addReactions = async (
	parentId: ObjectId,
	users: IUser[],
	maxReactions: number,
) => {
	const numReactions = getRandomInt(maxReactions) || 1;
	const usersReacting = getRandValuesFromArrayObjs(users, numReactions);

	return await Promise.all(
		usersReacting.map(async (user) => {
			const reaction = new Reaction({
				parent: parentId,
				user: user._id,
				type: getRandValueFromArray(reactionTypes),
			});

			const savedReaction = await reaction.save();
			return savedReaction._id;
		}),
	);
};

export const createRandomPost = async (options?: ICreatePostOptions) => {
	const users = await User.find().select("_id");

	const postData = getPostData(users, options);
	const post = new Post(postData);

	if (options?.author) post.author = options.author;

	if (options?.includeReactions) {
		const postReactions = await addReactions(post._id, users, 5);
		post.reactions = postReactions as unknown as ObjectId[];
	}

	const savedPost = await post.save();

	const includeComments = options?.includeComments !== false; // defaults to true
	if (includeComments) {
		const commentData = getComments(users, 10, savedPost._id);
		const commentDocsPromise = commentData.map(async (data) => {
			const comment = new Comment(data);

			const commentReactions = await addReactions(comment._id, users, 5);
			comment.reactions = commentReactions as unknown as ObjectId[];

			return comment;
		});

		const savedComments = await Promise.all(
			commentDocsPromise.map(async (commentDocPromise) => {
				const commentDoc = await commentDocPromise;
				const savedComment = await commentDoc.save();
				return savedComment._id;
			}),
		);

		savedPost.comments = savedComments;
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
		const post = (await createRandomPost(options)) as IPost;
		posts.push(post);
	}
	return posts;
};
