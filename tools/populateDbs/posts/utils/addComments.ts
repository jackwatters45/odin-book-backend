import { faker } from "@faker-js/faker";
import { ObjectId } from "mongoose";

import addReactions from "./addReactions";
import Comment, { IComment } from "../../../../src/models/comment.model";
import {
	getRandValuesFromArray,
	getRandomInt,
} from "../../utils/populateHelperFunctions";
import { IPost } from "../../../../src/models/post.model";

export const getComments = (
	userIds: ObjectId[],
	max = 3,
	post: Partial<IPost>,
	parentComment?: ObjectId,
): IComment[] => {
	const users = getRandValuesFromArray(userIds, max);
	return users.map(
		(user) =>
			new Comment({
				author: user,
				content: faker.lorem.sentence(),
				post,
				reactions: [],
				parentComment: parentComment ?? undefined,
			}),
	);
};

const addComment = async (
	comment: IComment,
	users: ObjectId[],
	post: Partial<IPost>,
	maxReplyDepth = 2,
	currentDepth = 0,
): Promise<ObjectId> => {
	try {
		const numReactions = getRandomInt(8 - currentDepth * 3, 0);
		comment.reactions = await addReactions(comment._id, users, numReactions);

		if (currentDepth < maxReplyDepth) {
			comment.replies = await addComments(
				users,
				post,
				maxReplyDepth,
				currentDepth + 1,
				comment._id,
			);
		}

		await comment.save();

		return comment._id;
	} catch (err) {
		throw new Error(err);
	}
};

const addComments = async (
	users: ObjectId[],
	post: Partial<IPost>,
	maxReplyDepth = 2,
	currentDepth = 0,
	parentCommentId?: ObjectId,
) => {
	const commentNum =
		currentDepth === 0 || faker.datatype.boolean()
			? getRandomInt(5 - currentDepth * 2, 0)
			: 0;
	const comments = getComments(users, commentNum, post, parentCommentId);

	try {
		return await Promise.all(
			comments.map((comment) =>
				addComment(comment, users, post, maxReplyDepth, currentDepth),
			),
		);
	} catch (err) {
		throw new Error(err);
	}
};

export default addComments;
