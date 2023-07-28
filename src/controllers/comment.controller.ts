import { body, validationResult } from "express-validator";
import { Request, Response } from "express";
import debug from "debug";
import expressAsyncHandler from "express-async-handler";
import passport from "passport";
import { ObjectId, startSession } from "mongoose";

import Comment from "../models/comment.model";
import Reaction, { reactionTypes } from "../models/reaction.model";
import { IUser } from "../models/user-model/user.model";
import Post from "../models/post.model";

const log = debug("log:commentController");

// @desc    Get all comments from post
// @route   GET /posts/:post/comments
// @access  Public
export const getComments = expressAsyncHandler(
	async (req: Request, res: Response) => {
		try {
			const postId = req.params.post;

			const [post, commentsCount, parentCommentsCount] = await Promise.all([
				Post.findById(postId),
				Comment.countDocuments({ post: postId }),
				Comment.countDocuments({ post: postId, parentComment: null }),
			]);

			if (!post) {
				res.status(404).json({ message: "Post not found" });
				return;
			}

			const commentsQuery = Comment.find({ post: postId, parentComment: null });

			if (req.query.offset) {
				const offset = parseInt(req.query.offset as string);
				commentsQuery.skip(offset);
			}

			if (req.query.limit) {
				const limit = parseInt(req.query.limit as string);
				commentsQuery.limit(limit);
			}

			// TODO: adjust sortBy options
			if (req.query.sortBy) {
				const sort = req.query.sortBy as string;
				if (sort === "likes") {
					commentsQuery.sort({ likes: -1, updatedAt: -1 });
				} else if (sort === "dislikes") {
					commentsQuery.sort({ dislikes: -1, updatedAt: -1 });
				} else if (sort === "reactions") {
					commentsQuery.sort({ reactions: -1, updatedAt: -1 });
				} else if (sort === "newest") {
					commentsQuery.sort({ updatedAt: -1 });
				} else if (sort === "replies") {
					commentsQuery.sort({ replies: -1, updatedAt: -1 });
				} else {
					commentsQuery.sort({ [sort]: -1 });
				}
			}

			const comments = await commentsQuery.exec();

			res.status(200).json({
				comments,
				meta: { total: commentsCount, totalParent: parentCommentsCount },
			});
		} catch (error) {
			log(error);
			res.status(500).json({ message: error.message });
		}
	},
);

// @desc    Get replies from comment
// @route   GET /posts/:post/comments/:id/replies
// @access  Public
export const getReplies = expressAsyncHandler(
	async (req: Request, res: Response) => {
		try {
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

			const { limit = 3, offset = 0 } = req.query;

			const replies = await Comment.find({ parentComment: req.params.id })
				.sort({ updatedAt: -1 })
				.skip(Number(offset))
				.limit(Number(limit))
				.populate("author", "firstName lastName avatarUrl isDeleted")
				.exec();

			res.status(200).json({ replies });
		} catch (error) {
			log(error);
			res.status(500).json({ message: error.message });
		}
	},
);

// @desc    Get comment by id
// @route   GET /posts/:post/comments/:id
// @access  Public
export const getCommentById = expressAsyncHandler(
	async (req: Request, res: Response) => {
		try {
			const [post, comment] = await Promise.all([
				Post.findById(req.params.post),
				Comment.findById(req.params.id).populate(
					"author",
					"firstName lastName avatarUrl isDeleted",
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
		} catch (error) {
			log(error);
			res.status(500).json({ message: error.message });
		}
	},
);

// @desc    Create comment
// @route   POST /posts/:post/comments
// @access  Private
export const createComment = [
	passport.authenticate("jwt", { session: false }),
	body("content").trim().notEmpty().withMessage("Comment content is required"),
	expressAsyncHandler(async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const user = req.user as IUser;
		if (!user) {
			res.status(401).json({ message: "No user logged in" });
			return;
		}

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

			await Post.findByIdAndUpdate(
				post,
				{
					$push: { comments: newComment._id },
				},
				{ new: true, session },
			);

			const author = {
				firstName: user.firstName,
				lastName: user.lastName,
				_id: user._id,
				avatarUrl: user.avatarUrl,
			};

			const commentWithAuthor = {
				content,
				post,
				_id: newComment._id,
				createdAt: new Date(),
				updatedAt: new Date(),
				likes: [],
				replies: [],
				isDeleted: false,
				parentComment: null,
				author,
			};

			await session.commitTransaction();

			res.status(201).json(commentWithAuthor);
		} catch (error) {
			await session.abortTransaction();

			log(error);
			res.status(500).json({ message: error.message });
		} finally {
			session.endSession();
		}
	}),
];

// @desc    Update comment
// @route   PUT posts/:post/comments/:id
// @access  Private
export const updateComment = [
	passport.authenticate("jwt", { session: false }),
	body("content").trim().notEmpty().withMessage("Comment content is required"),
	expressAsyncHandler(async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const user = req.user as IUser;
		if (!user) {
			res.status(401).json({ message: "No user logged in" });
			return;
		}

		try {
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

			res.status(201).json({ message: "Comment updated", comment });
		} catch (error) {
			log(error);
			res.status(500).json({ message: error.message });
		}
	}),
];

// @desc    Delete comment
// @route   DELETE posts/:post/comments/:id
// @access  Private
export const deleteComment = [
	passport.authenticate("jwt", { session: false }),
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		if (!user) {
			res.status(401).json({ message: "No user logged in" });
			return;
		}

		try {
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
				res.status(403).json({ message: "Not authorized" });
				return;
			}

			comment.content = "[deleted]";
			comment.isDeleted = true;
			const updatedComment = await comment.save();

			res.status(200).json({
				message: "Comment deleted successfully",
				comment: updatedComment,
			});
		} catch (error) {
			log(error);
			res.status(500).json({ message: error.message });
		}
	}),
];

// @desc    create comment reply
// @route   POST posts/:post/comments/:id/reply
// @access  Private
export const createCommentReply = [
	passport.authenticate("jwt", { session: false }),
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
		if (!user) {
			res.status(401).json({ message: "No user logged in" });
			return;
		}

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
				likes: [],
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
				{ new: true, session },
			);

			await session.commitTransaction();

			res.status(201).json({ newComment });
		} catch (error) {
			await session.abortTransaction();

			log(error);
			res.status(500).json({ message: error.message });
		} finally {
			session.endSession();
		}
	}),
];

// @desc    React to comment
// @route   POST posts/:post/comments/:id/react
// @access  Private
export const reactToComment = [
	passport.authenticate("jwt", { session: false }),
	body("type").trim().isIn(reactionTypes).withMessage("Invalid reaction type"),
	expressAsyncHandler(async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const user = req.user as IUser;
		if (!user) {
			res.status(401).json({ message: "No user logged in" });
			return;
		}

		try {
			const [post, comment] = await Promise.all([
				Post.findById(req.params.post),
				Comment.findById(req.params.id).populate("reactions"),
			]);

			if (!post) {
				res.status(404).json({ message: "Post not found" });
				return;
			}

			if (!comment) {
				res.status(404).json({ message: "Comment not found" });
				return;
			}

			const { type } = req.body;

			const existingReaction = await Reaction.findOne({
				parent: comment._id,
				author: user._id,
			});

			if (!existingReaction) {
				const reaction = new Reaction({
					parent: comment._id,
					user: user._id,
					type,
				});

				const savedReaction = await reaction.save();

				comment.reactions.push(savedReaction._id as unknown as ObjectId);
			} else {
				existingReaction.type = type;
				await existingReaction.save();
			}

			await comment.save();

			res.status(201).json({ message: "Reaction added", comment });
		} catch (error) {
			log(error);
			res.status(500).json({ message: error.message });
		}
	}),
];

// @desc    Unreact to comment
// @route   POST posts/:post/comments/:id/unreact
// @access  Private
export const unreactToComment = [
	passport.authenticate("jwt", { session: false }),
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;
		if (!user) {
			res.status(401).json({ message: "No user logged in" });
			return;
		}

		try {
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

			const existingReaction = await Reaction.findOne({
				parent: comment._id,
				user: user._id,
			});

			if (!existingReaction) {
				res
					.status(404)
					.json({ message: "User has not reacted to this comment" });
				return;
			}

			await Reaction.findByIdAndDelete(existingReaction._id);

			comment.reactions = comment.reactions.filter(
				(reaction) => reaction.toString() !== existingReaction._id.toString(),
			);

			await comment.save();

			res
				.status(201)
				.json({ message: "Reaction removed", comment: comment.toJSON() });
		} catch (error) {
			log(error);
			res.status(500).json({ message: error.message });
		}
	}),
];
