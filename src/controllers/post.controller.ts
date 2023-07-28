import { body, validationResult } from "express-validator";
import { Request, Response } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import uploadToCloudinary from "../utils/uploadToCloudinary";
import { Types } from "mongoose";
import passport from "passport";

import Post from "../models/post.model";
import User, { IUser } from "../models/user-model/user.model";
import expressAsyncHandler from "express-async-handler";
import { calculateStartTime } from "../utils/calculateStartTime";
import postValidation from "./utils/postValidation";
import { reactionTypes } from "../models/reaction.model";

const upload = multer();

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
		} catch (error) {
			res.status(500).json({ message: error.message });
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
		} catch (error) {
			res.status(500).json({ message: error.message });
		}
	},
);

// TODO validation
// TODO multer stuff
// TODO other logics (check in, life event)

// @desc    Create post
// @route   POST /posts
// @access  Private
export const createPost = [
	passport.authenticate("jwt", { session: false }),
	...postValidation,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const author = req.user as IUser;
		if (!author) {
			res.status(401).json({ message: "Author is required" });
			return;
		}

		const {
			published,
			taggedUsers,
			sharedFrom,
			content,
			media,
			feeling,
			lifeEvent,
			checkIn,
		} = req.body;

		const post = new Post({
			author: author._id,
			published,
			taggedUsers,
			sharedFrom,
			content,
			media,
			feeling,
			lifeEvent,
			checkIn,
		});

		try {
			await post.save();
			res.status(201).json({ post });
		} catch (error) {
			res.status(500).json({ message: error.message, post });
		}
	}),
];

// @desc    Update post
// @route   PUT /posts/:id
// @access  Private
export const updatePost = [
	passport.authenticate("jwt", { session: false }),
	...postValidation,
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

		const {
			published,
			taggedUsers,
			content,
			media,
			feeling,
			lifeEvent,
			checkIn,
		} = req.body;

		try {
			const post = await Post.findById(req.params.id);
			if (!post) {
				res.status(404).json({ message: "Post not found" });
				return;
			}

			if (post.author.toString() !== user.id && user.userType !== "admin") {
				res.status(403).json({
					message: "Only admin and the original author can update post",
				});
				return;
			}

			post.published = published;
			post.taggedUsers = taggedUsers;
			post.content = content;
			post.media = media;
			post.feeling = feeling;
			post.lifeEvent = lifeEvent;
			post.checkIn = checkIn;

			const updatedPost = await post.save();

			res.status(200).json({ post: updatedPost, message: "Post updated" });
		} catch (error) {
			res.status(500).json({ message: error.message });
		}
	}),
];

// @desc    Delete post
// @route   DELETE /posts/:id
// @access  Private
export const deletePost = [
	passport.authenticate("jwt", { session: false }),
	expressAsyncHandler(async (req: Request, res: Response) => {
		try {
			const user = req.user as IUser;
			if (!user) {
				res.status(401).json({ message: "No user logged in" });
				return;
			}

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

			res.status(200).json({ message: "Post deleted" });
		} catch (error) {
			res.status(500).json({ message: error.message });
		}
	}),
];

// @desc    React to post
// @route   PUT /posts/:id/react
// @access  Private
// export const reactToPost = [
// 	passport.authenticate("jwt", { session: false }),
// 	body("type").trim().isIn(reactionTypes).withMessage("Invalid reaction type"),
// 	expressAsyncHandler(async (req: Request, res: Response) => {
// 		const errors = validationResult(req);
// 		if (!errors.isEmpty()) {
// 			res.status(400).json({ errors: errors.array() });
// 			return;
// 		}

// 		const user = req.user as IUser;
// 		if (!user) {
// 			res.status(401).json({ message: "No user logged in" });
// 			return;
// 		}

// 		const { type } = req.body;

// 		try {
// 			const post = await Post.findById(req.params.post);
// 			if (!post) {
// 				res.status(404).json({ message: "Post not found" });
// 				return;
// 			}

// 			const reactionIndex = post.reactions.findIndex(
// 				(reaction) => reaction.user === user._id.toString(),
// 			);

// 			if (reactionIndex === -1) {
// 				post.reactions.push({ user: user._id, type, createdAt: new Date() });
// 			} else {
// 				post.reactions[reactionIndex].type = type;

// 			}

// 			await post.save();

// 			res.status(201).json({ message: "Reaction added", post });
// 		} catch (error) {
// 			res.status(500).json({ message: error.message });
// 		}
// 	}),
// ];

// @desc    Unreact to post
// @route   PUT /posts/:id/unreact
// @access  Private

// @desc    Share post
// @route   PUT /posts/:id/share
// @access  Private

// @desc    Unshare post
// @route   PUT /posts/:id/unshare
// @access  Private

// @desc    Get post likes
// @route   GET /posts/:id/likes
// @access  Public
