import { faker } from "@faker-js/faker";
import debug from "debug";
import { ObjectId } from "mongoose";

import Comment from "../../../../src/models/comment.model";

const log = debug("log:populateDbs:posts:utils:addRepliesToComment");

export const addReplyToComment = async (
	parentId: ObjectId,
	authorIds: ObjectId[],
) => {
	try {
		const parentComment = await Comment.findById(parentId);
		if (!parentComment) {
			log("Parent comment not found");
			return;
		}

		const reply = new Comment({
			content: faker.lorem.paragraph(),
			author: authorIds[Math.floor(Math.random() * authorIds.length)],
			parentComment: parentId,
			post: parentComment.post,
		});

		await reply.save();

		parentComment.replies.push(reply._id);

		await parentComment.save();

		log("Reply has been added successfully");
		return reply;
	} catch (error) {
		throw new Error(error);
	}
};

export const addRepliesToComment = async (
	commentId: ObjectId,
	authorIds: ObjectId[],
	repliesCount = 2,
) => {
	try {
		for (let i = 0; i < repliesCount; i++) {
			await addReplyToComment(commentId, authorIds);
		}

		log("Replies have been added successfully");

		return await Comment.find({ parentComment: commentId })
			.sort({
				updatedAt: -1,
			})
			.select("_id post parentComment");
	} catch (error) {
		console.error("An error occurred while adding replies: ", error);
	}
};

export const addRepliesToComments = async (
	comments: ObjectId[],
	authorIds: ObjectId[],
	repliesCount = 2,
) => {
	try {
		for (let i = 0; i < comments.length; i++) {
			await addRepliesToComment(comments[i], authorIds, repliesCount);
		}
	} catch (error) {
		throw new Error(error);
	}
};
