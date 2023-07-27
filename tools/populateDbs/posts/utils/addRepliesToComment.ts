import { faker } from "@faker-js/faker";
import debug from "debug";
import { ObjectId } from "mongoose";

import Comment from "../../../../src/models/comment.model";
import { IUser } from "../../../../src/models/user-model/user.model";

const log = debug("log:populateDbs:posts:utils:addRepliesToComment");

export const addReplyToComment = async (
	parentId: ObjectId,
	authorArr: IUser[],
) => {
	try {
		const parentComment = await Comment.findById(parentId);
		if (!parentComment) {
			log("Parent comment not found");
			return;
		}

		const reply = new Comment({
			content: faker.lorem.paragraph(),
			author: authorArr[Math.floor(Math.random() * authorArr.length)]._id,
			parentComment: parentId,
			post: parentComment.post,
		});

		await reply.save();

		parentComment.replies.push(reply._id);

		await parentComment.save();

		log("Reply has been added successfully");
		return reply;
	} catch (error) {
		console.error("An error occurred while adding a reply: ", error);
	}
};

export const addRepliesToComment = async (
	commentId: ObjectId,
	authorArr: IUser[],
	repliesCount = 2,
) => {
	try {
		for (let i = 0; i < repliesCount; i++) {
			await addReplyToComment(commentId, authorArr);
		}

		log("Replies have been added successfully");

		return await Comment.find({ parentComment: commentId })
			.sort({ updatedAt: -1 })
			.exec();
	} catch (error) {
		console.error("An error occurred while adding replies: ", error);
	}
};

export const addRepliesToComments = async (
	comments: ObjectId[],
	authorArr: IUser[],
	repliesCount = 2,
) => {
	try {
		for (let i = 0; i < comments.length; i++) {
			await addRepliesToComment(comments[i], authorArr, repliesCount);
		}
	} catch (error) {
		console.error("An error occurred while adding replies: ", error);
	}
};
