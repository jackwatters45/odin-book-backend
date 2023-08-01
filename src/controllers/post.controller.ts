import { body, validationResult } from "express-validator";
import { Request, Response } from "express";
// import { v2 as cloudinary } from "cloudinary";
// import uploadToCloudinary from "../utils/uploadToCloudinary";
import { ObjectId } from "mongoose";
import passport from "passport";
import debug from "debug";

import Post from "../models/post.model";
import User, { IUser } from "../models/user-model/user.model";
import expressAsyncHandler from "express-async-handler";
// import { calculateStartTime } from "../utils/calculateStartTime";
import postValidation from "./utils/postValidation";
import Reaction, { reactionTypes } from "../models/reaction.model";
// import resizeImages from "../utils/resizeImages";

const log = debug("log:post:controller");

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
			log(error);
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
			log(error);
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
			feeling,
			lifeEvent,
			checkIn,
		} = req.body;

		// let media = "";
		// const resizedImages = await resizeImages(req.files);
		// if (resizedImages) media = await uploadToCloudinary(resizedImages);

		const post = new Post({
			author: author._id,
			published,
			taggedUsers,
			sharedFrom,
			content,
			// media,
			feeling,
			lifeEvent,
			checkIn,
		});

		try {
			await post.save();
			res.status(201).json({ post });
		} catch (error) {
			log(error);
			res.status(500).json({ message: error.message, post });
		}
	}),
];

// @desc    Update post
// @route   PATCH /posts/:id
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

			log(post);
			log(user);
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
			post.media = media;
			post.feeling = feeling;
			post.lifeEvent = lifeEvent;
			post.checkIn = checkIn;

			const updatedPost = await post.save();

			res.status(200).json({ post: updatedPost, message: "Post updated" });
		} catch (error) {
			log(error);
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

			res.status(200).json({ message: "Post deleted", post });
		} catch (error) {
			log(error);
			res.status(500).json({ message: error.message });
		}
	}),
];

// @desc    React to post
// @route   PATCH /posts/:id/react
// @access  Private
export const reactToPost = [
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
		} catch (error) {
			log(error);
			res.status(500).json({ message: error.message });
		}
	}),
];

// @desc    Unreact to post
// @route   DELETE /posts/:id/unreact
// @access  Private
export const unreactToPost = [
	passport.authenticate("jwt", { session: false }),
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;
		if (!user) {
			res.status(401).json({ message: "No user logged in" });
			return;
		}

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
		} catch (error) {
			log(error);
			res.status(500).json({ message: error.message });
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

			log(post);

			const reactions = await Reaction.find({ parent: post._id })
				.populate("user", "firstName lastName isDeleted avatarUrl")
				.sort({ createdAt: -1 });

			res.status(200).json({ reactions });
		} catch (error) {
			log(error);
			res.status(500).json({ message: error.message });
		}
	},
);

// @desc    Toggle saved post
// @route   PATCH /posts/saved-posts/:id
// @access  Private
export const toggleSavedPost = [
	passport.authenticate("jwt", { session: false }),
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;
		if (!user) {
			res.status(401).json({ message: "No user logged in" });
			return;
		}

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
		} catch (error) {
			res.status(500).json({ message: error.message });
		}
	}),
];

// @desc    Get saved posts
// @route   GET /posts/saved-posts
// @access  Private
export const getSavedPosts = [
	passport.authenticate("jwt", { session: false }),
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;
		if (!user) {
			res.status(401).json({ message: "No user logged in" });
			return;
		}

		try {
			const posts = await Post.find({ _id: { $in: user.savedPosts } })
				.populate("author", "firstName lastName isDeleted avatarUrl")
				.sort({ createdAt: -1 });

			res.status(200).json({ posts });
		} catch (error) {
			res.status(500).json({ message: error.message });
		}
	}),
];

// @desc    Share post
// @route   POST /posts/:id/share
// @access  Private
export const sharePost = [
	passport.authenticate("jwt", { session: false }),
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;
		if (!user) {
			res.status(401).json({ message: "No user logged in" });
			return;
		}

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
		} catch (error) {
			res.status(500).json({ message: error.message });
		}
	}),
];

// @desc    Get posts by user's friends
// @route   GET /posts/friends
// @access  Private
export const getPostsByFriends = [
	passport.authenticate("jwt", { session: false }),
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;
		if (!user) {
			res.status(401).json({ message: "No user logged in" });
			return;
		}

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
		} catch (error) {
			console.error(error);
			res.status(500).json({ message: error.message });
		}
	}),
];
