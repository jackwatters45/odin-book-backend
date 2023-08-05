import { faker } from "@faker-js/faker";
import { ObjectId } from "mongoose";

import addReactions from "./addReactions";
import Comment, { IComment } from "../../../../src/models/comment.model";
import { getRandValuesFromArray } from "../../utils/populateHelperFunctions";

export const getComments = (userIds: ObjectId[], max = 3, post: ObjectId) => {
	const users = getRandValuesFromArray(userIds, max);
	return users.map((user) => ({
		author: user,
		content: faker.lorem.sentence(),
		post,
		likes: getRandValuesFromArray(users, 5),
	}));
};

const addComment = async (
	commentData: Partial<IComment>,
	users: ObjectId[],
): Promise<ObjectId> => {
	const comment = new Comment(commentData);

	try {
		comment.reactions = (await addReactions(
			comment._id,
			users,
			5,
		)) as unknown as ObjectId[];

		return (await comment.save())._id;
	} catch (err) {
		throw new Error(err);
	}
};

const addComments = async (users: ObjectId[], savedPostId: ObjectId) => {
	const commentData = getComments(users, 10, savedPostId);

	try {
		return await Promise.all(
			commentData.map((commentData) => addComment(commentData, users)),
		);
	} catch (err) {
		throw new Error(err);
	}
};

export default addComments;
