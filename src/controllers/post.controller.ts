import { body, validationResult } from "express-validator";
import { Request, Response } from "express";
import { ObjectId } from "mongoose";
import debug from "debug";

import Post from "../models/post.model";
import User from "../models/user.model";
import { IUser } from "../../types/IUser";
import expressAsyncHandler from "express-async-handler";
// import { calculateStartTime } from "../utils/calculateStartTime";
import postValidation from "./utils/postValidation";
import Reaction, { reactionTypes } from "../models/reaction.model";
import resizeImages from "../utils/resizeImages";
import { uploadFilesToCloudinary } from "../utils/uploadToCloudinary";
import { authenticateJwt } from "../middleware/authenticateJwt";

const log = debug("log:post:controller");
const errorLog = debug("err:post:controller");

// TODO specific populate options

// @desc    Get all posts
// @route   GET /posts
// @access  Public
export const getPosts = expressAsyncHandler(
	async (req: Request, res: Response) => {
		try {
			const match = { published: true };
			const postsCount = await Post.countDocuments(match);
			const postsQuery = Post.find(match)
				.populate("author", "firstName lastName isDeleted")
				.sort({ createdAt: -1 });

			if (req.query.offset) {
				const offset = parseInt(req.query.offset as string);
				postsQuery.skip(offset);
			}
			if (req.query.limit) {
				const limit = parseInt(req.query.limit as string);
				postsQuery.limit(limit);
			}

			const posts = await postsQuery.exec();
			res.status(200).json({ posts, meta: { total: postsCount } });
		} catch (err) {
			errorLog(err);
			res.status(500).json({ message: err.message });
		}
	},
);

// @desc    Get post by id
// @route   GET /posts/:id
// @access  Public
export const getPostById = expressAsyncHandler(
	async (req: Request, res: Response) => {
		try {
			const post = await Post.findById(req.params.id)
				.populate(
					"author",
					"firstName lastName description followers isDeleted avatarUrl",
				)
				.populate({
					path: "comments",
					populate: {
						path: "author",
						select: "firstName lastName isDeleted avatarUrl",
					},
				});

			res.status(200).json({ post });
		} catch (err) {
			errorLog(err);
			res.status(500).json({ message: err.message });
		}
	},
);

// TODO multer stuff
// TODO other logics (check in, life event)

// @desc    Create post
// @route   POST /posts
// @access  Private
export const createPost = [
	authenticateJwt,
	...postValidation,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const author = req.user as IUser;

		const {
			published,
			taggedUsers,
			sharedFrom,
			content,
			feeling,
			lifeEvent,
			checkIn,
		} = req.body;

		const post = new Post({
			author: author._id,
			published,
			taggedUsers, // ObjectId[]
			sharedFrom, // ObjectId
			content, // string
			feeling, // string
			lifeEvent, // object
			checkIn, // object
		});

		try {
			if (req.files) {
				const files = req.files;
				const resizedImages = await resizeImages(files);
				const imageLinks = await uploadFilesToCloudinary(resizedImages);
				post.media = imageLinks;
			}

			await post.save();
			res.status(201).json({ post });
		} catch (err) {
			errorLog(err);
			res.status(500).json({ message: err.message, post });
		}
	}),
];

// @desc    Update post
// @route   PATCH /posts/:id
// @access  Private
export const updatePost = [
	authenticateJwt,
	...postValidation,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const user = req.user as IUser;

		const { published, taggedUsers, content, feeling, lifeEvent, checkIn } =
			req.body;

		try {
			const post = await Post.findById(req.params.id);
			if (!post) {
				res.status(404).json({ message: "Post not found" });
				return;
			}

			if (
				post.author.toString() !== user._id.toString() &&
				user.userType !== "admin"
			) {
				res.status(403).json({
					message: "Only admin and the original author can update post",
				});
				return;
			}

			post.published = published;
			post.taggedUsers = taggedUsers;
			post.content = content;
			post.feeling = feeling;
			post.lifeEvent = lifeEvent;
			post.checkIn = checkIn;

			if (req.files) {
				const files = req.files;
				const resizedImages = await resizeImages(files);
				const imageLinks = await uploadFilesToCloudinary(resizedImages);
				post.media = imageLinks;
			}

			const updatedPost = await post.save();

			res.status(200).json({ post: updatedPost, message: "Post updated" });
		} catch (err) {
			errorLog(err);
			res.status(500).json({ message: err.message });
		}
	}),
];

// @desc    Delete post
// @route   DELETE /posts/:id
// @access  Private
export const deletePost = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		try {
			const user = req.user as IUser;

			const post = await Post.findById(req.params.id);
			if (!post) {
				res.status(404).json({ message: "Post not found" });
				return;
			}

			if (post.author.toString() !== user.id && user.userType !== "admin") {
				res.status(403).json({ message: "Unauthorized" });
				return;
			}

			await Post.findByIdAndDelete(req.params.id);

			res.status(200).json({ message: "Post deleted", post });
		} catch (err) {
			errorLog(err);
			res.status(500).json({ message: err.message });
		}
	}),
];

// @desc    React to post
// @route   PATCH /posts/:id/react
// @access  Private
export const reactToPost = [
	authenticateJwt,
	body("type").trim().isIn(reactionTypes).withMessage("Invalid reaction type"),
	expressAsyncHandler(async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const user = req.user as IUser;

		const { type } = req.body;

		try {
			const post = await Post.findById(req.params.id);
			if (!post) {
				res.status(404).json({ message: "Post not found" });
				return;
			}

			const existingReaction = await Reaction.findOne({
				parent: post._id,
				author: user._id,
			});

			if (!existingReaction) {
				const reaction = new Reaction({
					parent: post._id,
					user: user._id,
					type,
				});

				const savedReaction = await reaction.save();

				post.reactions.push(savedReaction._id as unknown as ObjectId);
			} else {
				existingReaction.type = type;
				await existingReaction.save();
			}

			await post.save();

			res.status(201).json({ message: "Reaction added", post });
		} catch (err) {
			errorLog(err);
			res.status(500).json({ message: err.message });
		}
	}),
];

// @desc    Unreact to post
// @route   DELETE /posts/:id/unreact
// @access  Private
export const unreactToPost = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		try {
			const post = await Post.findById(req.params.id);
			if (!post) {
				res.status(404).json({ message: "Post not found" });
				return;
			}

			const existingReaction = await Reaction.findOne({
				parent: post._id,
				user: user._id,
			});

			if (!existingReaction) {
				res
					.status(404)
					.json({ message: "User has not reacted to this comment" });
				return;
			}

			await Reaction.findByIdAndDelete(existingReaction._id);

			post.reactions = post.reactions.filter(
				(reaction) => reaction.toString() !== existingReaction._id.toString(),
			);

			await post.save();

			res.status(200).json({ message: "Reaction removed", post });
		} catch (err) {
			errorLog(err);
			res.status(500).json({ message: err.message });
		}
	}),
];

// @desc    Get post reactions
// @route   GET /posts/:id/reactions
// @access  Public
export const getPostReactions = expressAsyncHandler(
	async (req: Request, res: Response) => {
		try {
			const post = await Post.findById(req.params.id);
			if (!post) {
				res.status(404).json({ message: "Post not found" });
				return;
			}

			const reactions = await Reaction.find({ parent: post._id })
				.populate("user", "firstName lastName isDeleted avatarUrl")
				.sort({ createdAt: -1 });

			res.status(200).json({ reactions });
		} catch (err) {
			errorLog(err);
			res.status(500).json({ message: err.message });
		}
	},
);

// @desc    Toggle saved post
// @route   PATCH /posts/saved-posts/:id
// @access  Private
export const toggleSavedPost = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		try {
			const post = await Post.findById(req.params.id);
			if (!post) {
				res.status(404).json({ message: "Post not found" });
				return;
			}

			const postId = post._id;

			const isPostSaved = user.savedPosts.includes(postId);

			const updateOperation = isPostSaved
				? { $pull: { savedPosts: postId } }
				: { $addToSet: { savedPosts: postId } };

			const userUpdated = await User.findByIdAndUpdate(
				user._id,
				updateOperation,
				{ new: true },
			);

			res.status(200).json({ savedPosts: userUpdated?.savedPosts });
		} catch (err) {
			res.status(500).json({ message: err.message });
		}
	}),
];

// @desc    Get saved posts
// @route   GET /posts/saved-posts
// @access  Private
export const getSavedPosts = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		try {
			const posts = await Post.find({ _id: { $in: user.savedPosts } })
				.populate("author", "firstName lastName isDeleted avatarUrl")
				.sort({ createdAt: -1 });

			res.status(200).json({ posts });
		} catch (err) {
			res.status(500).json({ message: err.message });
		}
	}),
];

// @desc    Share post
// @route   POST /posts/:id/share
// @access  Private
export const sharePost = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		try {
			const post = await Post.findById(req.params.id);

			if (!post) {
				res.status(404).json({ message: "Post not found" });
				return;
			}

			const sharedPost = new Post({
				author: user._id,
				published: true,
				sharedFrom: post._id,
			});

			await sharedPost.save();

			res.status(201).json({ message: "Post shared successfully", sharedPost });
		} catch (err) {
			res.status(500).json({ message: err.message });
		}
	}),
];

// @desc    Get posts by user's friends
// @route   GET /posts/friends
// @access  Private
export const getPostsByFriends = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		try {
			const match = {
				published: true,
				author: { $in: user.friends },
			};

			const postsCount = await Post.countDocuments(match);
			const { offset, limit } = req.query;
			const posts = await Post.find(match)
				.skip(parseInt(offset as string) || 0)
				.limit(parseInt(limit as string) || 0)
				.populate("author", "firstName lastName isDeleted")
				.sort({ createdAt: -1 });

			if (!posts) {
				res.status(404).json({ message: "No posts found" });
				return;
			}

			res.status(200).json({ posts, meta: { total: postsCount } });
		} catch (err) {
			res.status(500).json({ message: err.message });
		}
	}),
];
