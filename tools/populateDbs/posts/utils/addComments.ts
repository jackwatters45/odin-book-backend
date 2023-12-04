import { faker } from "@faker-js/faker";
import { ObjectId } from "mongoose";

import addReactions from "./addReactions";
import Comment, { IComment } from "../../../../src/models/comment.model";
import {
	getRandValuesFromArrayOfObjs,
	getRandomInt,
} from "../../utils/helperFunctions";
import { IPost } from "../../../../src/models/post.model";
import { createNotificationWithMultipleFrom } from "../../../../src/controllers/notifications/notification.controller";
import { getNotificationBetweenDates } from "../../utils/getNotificationBetweenDates";
import { IUser } from "../../../../src/models/user.model";

interface GetCommentsParams {
	users: IUser[];
	max?: number;
	post: IPost;
	parentCommentId?: ObjectId;
}

export const getComments = ({
	users,
	post,
	parentCommentId,
	max = 3,
}: GetCommentsParams): IComment[] => {
	const commenters = getRandValuesFromArrayOfObjs(users, max);
	return commenters.map(
		(commenter) =>
			new Comment({
				author: commenter,
				content: faker.lorem.sentence(),
				post,
				reactions: [],
				parentComment: parentCommentId ?? undefined,
			}),
	);
};

interface CommentBaseParams {
	users: IUser[];
	post: IPost;
}

interface DepthParams {
	maxReplyDepth?: number;
	currentDepth?: number;
}

interface addCommentParams extends CommentBaseParams, DepthParams {
	comment: IComment;
}

const addComment = async ({
	comment,
	users,
	post,
	maxReplyDepth = 1,
	currentDepth = 0,
}: addCommentParams): Promise<ObjectId> => {
	try {
		const numReactions = getRandomInt(8 - currentDepth * 3, 0);

		const reactionsPromise = addReactions(
			comment,
			users,
			numReactions,
			"comment",
		);

		let repliesPromise: Promise<ObjectId[]> = Promise.resolve([]);
		if (currentDepth < maxReplyDepth) {
			repliesPromise = addComments({
				users,
				post,
				maxReplyDepth,
				currentDepth: currentDepth + 1,
				parentCommentId: comment._id,
			});
		}

		const [reactions, replies] = await Promise.all([
			reactionsPromise,
			repliesPromise,
		]);

		comment.reactions = reactions;
		comment.replies = replies;

		await comment.save();

		await createNotificationWithMultipleFrom({
			query: {
				to: post.author,
				type: "comment",
				contentType: currentDepth === 0 ? "post" : "comment",
				contentId: currentDepth === 0 ? post._id : comment._id,
				postId: post._id,
			},
			from: String(comment.author),
			date: getNotificationBetweenDates(),
			includeSocket: false,
		});

		return comment._id;
	} catch (err) {
		throw new Error(err);
	}
};

interface AddCommentsParams extends CommentBaseParams, DepthParams {
	parentCommentId?: ObjectId;
}

const addComments = async ({
	users,
	post,
	maxReplyDepth = 2,
	currentDepth = 0,
	parentCommentId,
}: AddCommentsParams): Promise<ObjectId[]> => {
	const commentNum =
		currentDepth === 0 || faker.datatype.boolean()
			? getRandomInt(5 - currentDepth * 2, 0)
			: 0;
	const comments = getComments({
		users,
		max: commentNum,
		post,
		parentCommentId,
	});

	try {
		return await Promise.all(
			comments.map((comment) =>
				addComment({ comment, users, post, maxReplyDepth, currentDepth }),
			),
		);
	} catch (err) {
		throw new Error(err);
	}
};

export default addComments;
