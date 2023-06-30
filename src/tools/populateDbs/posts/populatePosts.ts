import debug from "debug";
import { faker } from "@faker-js/faker";

import configDb from "../../../config/database";
import Post from "../../../models/post.model";
import User, { IUser } from "../../../models/user-model/user.model";
import Comment from "../../../models/comment.model";

import {
	getComments,
	getRandValueFromArray,
	getRandValueFromArrayObjs,
	getRandValuesFromArrayObjs,
} from "../utils/populateHelperFunctions";
import { feelings } from "./utils/postOptions";

const log = debug("log");

// Config Db
configDb();

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

const createPost = async () => {
	const users = await User.find().select("_id");

	const postData = getPostData(users);
	const post = new Post(postData);

	const savedPost = await post.save();

	const commentData = getComments(users, 10, savedPost._id);
	const commentDocs = commentData.map((data) => new Comment(data));
	const savedComments = await Promise.all(
		commentDocs.map((comment) => comment.save()),
	);

	savedPost.comments = savedComments.map((comment) => comment._id);

	const posts = await Post.find().select("_id");
	log(posts);

	if (posts.length && faker.datatype.boolean(0.1)) {
		const sharedFrom = getRandValueFromArray(posts);
		savedPost.sharedFrom = sharedFrom._id;
	}
	await savedPost.save();

	log(savedPost);
};

const createPosts = (quantity = 1) => {
	for (let i = 0; i < quantity; i++) {
		createPost();
	}
};

createPosts();

// TODO comments -> replies an parent comment

// commits
// clear data -> readd data
