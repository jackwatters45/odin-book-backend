import { body, validationResult } from "express-validator";
import { Request, Response } from "express";
import debug from "debug";
import expressAsyncHandler from "express-async-handler";
import { startSession } from "mongoose";

import Comment, { IComment } from "../../models/comment.model";
import Reaction, { reactionTypes } from "../../models/reaction.model";
import Post from "../../models/post.model";
import authenticateJwt from "../../middleware/authenticateJwt";
import defaultCommentPopulation from "./utils/defaultCommentPopulation";
import getDocumentWithTopReactions from "../../utils/getDocumentWithTopReactions";
import {
	createNotificationWithMultipleFrom,
	removeUserFromNotificationMultipleFrom,
} from "../notifications/notification.controller";
import { IUser } from "../../models/user.model";

const log = debug("log:comment:controller");

// @desc    Get all comments from post
// @route   GET /posts/:post/comments
// @access  Private
export const getComments = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const postId = req.params.post;

		const comments = (await Comment.find({
			post: postId,
			parentComment: null,
		}).populate(defaultCommentPopulation)) as IComment[];

		const commentsWithTopReactions = comments.map((comment) => {
			return getDocumentWithTopReactions(comment);
		});

		res.status(200).json(commentsWithTopReactions);
	},
);

// @desc    Get replies from comment
// @route   GET /posts/:post/comments/:id/replies
// @access  Private
export const getReplies = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const [post, comment] = await Promise.all([
			Post.findById(req.params.post),
			Comment.findById(req.params.id),
		]);

		if (!post) {
			res.status(404).json({ message: "Post not found" });
			return;
		}

		if (!comment) {
			res.status(404).json({ message: "Comment not found" });
			return;
		}

		const replies = await Comment.find({ parentComment: req.params.id })
			.sort({ updatedAt: -1 })
			.populate(defaultCommentPopulation);

		const commentsWithTopReactions = replies.map((reply) => {
			return getDocumentWithTopReactions(reply);
		});

		res.status(200).json(commentsWithTopReactions); // removed offset + limit
	},
);

// @desc    Get comment by id
// @route   GET /posts/:post/comments/:id
// @access  Private
export const getCommentById = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const [post, comment] = await Promise.all([
			Post.findById(req.params.post),
			Comment.findById(req.params.id).populate(
				"author",
				"fullName avatarUrl isDeleted",
			),
		]);

		if (!post) {
			res.status(404).json({ message: "Post not found" });
			return;
		}

		if (!comment) {
			res.status(404).json({ message: "Comment not found" });
			return;
		}

		res.status(200).json({ comment, message: "Comment found" });
	},
);

// @desc    Create comment
// @route   POST /posts/:post/comments
// @access  Private
export const createComment = [
	authenticateJwt,
	body("content").trim().notEmpty().withMessage("Comment content is required"),
	expressAsyncHandler(async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const user = req.user as IUser;

		const authorId = user._id;
		const { post } = req.params;
		const { content } = req.body;

		const session = await startSession();
		session.startTransaction();

		try {
			const comment = new Comment({
				content,
				author: authorId,
				post,
				likes: [],
				replies: [],
				isDeleted: false,
				parentComment: null,
			});

			const newComment = await comment.save();

			const postData = await Post.findByIdAndUpdate(
				post,
				{
					$push: { comments: newComment._id },
				},
				{ new: true, session },
			).select("author");

			const notificationQuery = {
				to: postData?.author,
				type: "comment",
				contentId: post,
				contentType: "post",
			};

			await createNotificationWithMultipleFrom({
				query: notificationQuery,
				from: authorId,
			});

			const authorPreview = {
				fullName: user.fullName,
				_id: user._id,
				avatarUrl: user.avatarUrl,
			};

			const commentWithAuthor = {
				content,
				post,
				_id: newComment._id,
				createdAt: new Date(),
				updatedAt: new Date(),
				reactions: [],
				replies: [],
				isDeleted: false,
				parentComment: null,
				author: authorPreview,
			};

			await session.commitTransaction();

			res.status(201).json(commentWithAuthor);
		} catch (err) {
			await session.abortTransaction();
			throw new Error(err);
		} finally {
			session.endSession();
		}
	}),
];

// @desc    Update comment
// @route   PATCH posts/:post/comments/:id
// @access  Private
export const updateComment = [
	authenticateJwt,
	body("content").trim().notEmpty().withMessage("Comment content is required"),
	expressAsyncHandler(async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const user = req.user as IUser;

		const [post, comment] = await Promise.all([
			Post.findById(req.params.post),
			Comment.findById(req.params.id),
		]);

		if (!post) {
			res.status(404).json({ message: "Post not found" });
			return;
		}

		if (!comment) {
			res.status(404).json({ message: "Comment not found" });
			return;
		}

		if (comment.author.toString() !== user._id.toString()) {
			res.status(403).json({
				message: "You must be the original commenter to edit a comment",
			});
			return;
		}

		comment.content = req.body.content;
		await comment.save();

		const updatedComment = (await Comment.findById(req.params.id).populate(
			defaultCommentPopulation,
		)) as IComment;

		const updatedCommentWithTopReactions =
			getDocumentWithTopReactions(updatedComment);

		res.status(201).json(updatedCommentWithTopReactions);
	}),
];

// @desc    Delete comment
// @route   DELETE posts/:post/comments/:id
// @access  Private
export const deleteComment = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		const [post, comment] = await Promise.all([
			Post.findById(req.params.post).select("author"),
			Comment.findById(req.params.id),
		]);

		if (!post) {
			res.status(404).json({ message: "Post not found" });
			return;
		}

		if (!comment) {
			res.status(404).json({ message: "Comment not found" });
			return;
		}

		if (comment.author.toString() !== user._id.toString()) {
			res.status(403).json({ message: "Not authorized" });
			return;
		}

		comment.content = "[deleted]";
		comment.isDeleted = true;
		const updatedComment = (await Comment.findByIdAndUpdate(
			req.params.id,
			comment,
			{ new: true },
		).populate(defaultCommentPopulation)) as IComment;

		const commentWithTopReactions = getDocumentWithTopReactions(updatedComment);

		res.status(200).json(commentWithTopReactions);
	}),
];

// @desc    create comment reply
// @route   POST posts/:post/comments/:id/reply
// @access  Private
export const createCommentReply = [
	authenticateJwt,
	body("content")
		.trim()
		.isLength({ min: 1, max: 500 })
		.withMessage("Content must be between 1 and 500 characters long"),
	expressAsyncHandler(async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const user = req.user as IUser;

		const session = await startSession();
		session.startTransaction();

		try {
			const comment = await Comment.findById(req.params.id);

			if (!comment) {
				res.status(404).json({ message: "Comment not found" });
				return;
			}

			const { post, _id } = comment;
			const newComment = new Comment({
				content: req.body.content,
				post: post,
				author: user._id,
				reactions: [],
				replies: [],
				isDeleted: false,
				parentComment: _id,
			});

			await newComment.save();

			comment.replies.push(newComment._id);
			await comment.save();

			await Post.findByIdAndUpdate(
				post,
				{
					$push: { comments: newComment._id },
				},
				{ session },
			);

			const notificationQuery = {
				to: comment.author,
				type: "comment",
				contentId: newComment._id,
				contentType: "comment",
				postId: post,
			};

			await createNotificationWithMultipleFrom({
				query: notificationQuery,
				from: user._id,
			});

			await session.commitTransaction();

			const populatedNewComment = await Comment.findById(
				newComment._id,
			).populate(defaultCommentPopulation);

			res.status(201).json(populatedNewComment);
		} catch (err) {
			await session.abortTransaction();
			throw new Error(err);
		} finally {
			session.endSession();
		}
	}),
];

// @desc    React to comment
// @route   POST posts/:post/comments/:id/react
// @access  Private
export const reactToComment = [
	authenticateJwt,
	body("type").trim().isIn(reactionTypes).withMessage("Invalid reaction type"),
	body("user").trim().isMongoId().withMessage("Invalid user id"),
	expressAsyncHandler(async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const user = req.user as IUser;
		const commentId = req.params.id;
		const type = req.body.type;

		log(req.body);

		const existingReaction = await Reaction.findOne({
			parent: commentId,
			user: user._id,
		});

		if (!existingReaction) {
			const reaction = new Reaction({
				parent: commentId,
				user: user._id,
				type,
			});

			const savedReaction = await reaction.save();

			await Comment.findByIdAndUpdate(commentId, {
				$push: { reactions: savedReaction._id },
			});
		} else {
			existingReaction.type = type;
			await existingReaction.save();
		}

		const comment = (await Comment.findById(req.params.id).populate(
			defaultCommentPopulation,
		)) as IComment;

		const notificationQuery = {
			to: comment.author,
			type: "reaction",
			contentId: comment._id,
			contentType: "comment",
			postId: req.params.post,
		};

		await createNotificationWithMultipleFrom({
			query: notificationQuery,
			from: user._id,
		});

		const commentWithTopReactions = getDocumentWithTopReactions(comment);

		res.status(201).json(commentWithTopReactions);
	}),
];

// @desc    Unreact to comment
// @route   DELETE posts/:post/comments/:id/unreact
// @access  Private
export const unreactToComment = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;
		const commentId = req.params.id;
		const postId = req.params.post;

		const existingReaction = await Reaction.findOne({
			parent: commentId,
			user: user._id,
		});

		if (!existingReaction) {
			res.status(404).json({ message: "User has not reacted to this comment" });
			return;
		}

		await Reaction.findByIdAndDelete(existingReaction._id);

		const comment = (await Comment.findByIdAndUpdate(
			commentId,
			{ $pull: { reactions: existingReaction._id } },
			{ new: true },
		).populate(defaultCommentPopulation)) as IComment;

		if (!comment) {
			res.status(404).json({ message: "Comment not found" });
			return;
		}

		const notificationQuery = {
			to: comment.author,
			type: "reaction",
			contentId: comment._id,
			contentType: "comment",
			postId,
		};

		await removeUserFromNotificationMultipleFrom({
			query: notificationQuery,
			remove: user._id,
		});

		const commentWithTopReactions = getDocumentWithTopReactions(comment);

		res.status(201).json(commentWithTopReactions);
	}),
];
