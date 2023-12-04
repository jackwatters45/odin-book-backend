import { body, validationResult } from "express-validator";
import { Request, Response } from "express";
import { ObjectId } from "mongoose";
import expressAsyncHandler from "express-async-handler";
import debug from "debug";

import Post, { IPost } from "../../models/post.model";
import User, { IUser } from "../../models/user.model";
import Reaction, { reactionTypes } from "../../models/reaction.model";

import { postValidation, postAudienceValidation } from "./validations";
import resizeImages from "../../utils/resizeImages";
import { uploadFilesToCloudinary } from "../../utils/uploadToCloudinary";
import authenticateJwt from "../../middleware/authenticateJwt";
import upload from "../../config/multer";

import {
	defaultPostPopulation,
	getPostAndCommentsTopReactions,
	getOtherPostData,
} from "./utils";
import {
	createNotificationWithMultipleFrom,
	removeNotificationsFromDeletedPost,
	removeUserFromNotificationMultipleFrom,
} from "../notifications/notification.controller";

const log = debug("log:post:controller");

// @desc    Get all posts
// @route   GET /posts
// @access  Public
export const getPosts = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const pageLength = 5;

		const postsCount = await Post.countDocuments();
		const postsQuery = Post.find()
			.populate(defaultPostPopulation)
			.sort({ createdAt: -1 });

		if (req.query.page) {
			const offset = parseInt(req.query.page as string) * pageLength;
			postsQuery.skip(offset);
		}
		if (req.query.limit) {
			const limit = parseInt(req.query.limit as string);
			postsQuery.limit(limit);
		}

		const posts = await postsQuery.exec();
		res.status(200).json({ posts, meta: { total: postsCount } });
	},
);

// @desc    Get user posts
// @route   GET /users/:id/posts
// @access  Public
export const getUserPosts = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const reqUser = req.user as IUser;

		const pageLength = 20;
		const limit = req.query.limit
			? parseInt(req.query.limit as string)
			: pageLength;
		const page = req.query.page ? parseInt(req.query.page as string) : 0;

		const user = await User.findById(req.params.id);
		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		if (user.isDeleted) {
			res.status(404).json({ message: "User has been deleted" });
			return;
		}

		const isSelf = String(reqUser._id) === String(user._id);

		const isFriends = reqUser.friends.some(
			(friend) => String(friend) === String(user._id),
		);

		const audienceQuery = isSelf
			? {}
			: isFriends
			? {
					$or: [{ audience: "Friends" }, { audience: "Public" }],
			  }
			: { audience: "Public" };

		const fromQuery = {
			$or: [
				{ author: req.params.id },
				{ to: req.params.id },
				{ taggedUsers: { $elemMatch: { $eq: req.params.id } } },
			],
		};

		const query = {
			$and: [fromQuery, audienceQuery].filter((q) => Object.keys(q).length > 0),
		};

		const posts = await Post.find(query)
			.sort({ createdAt: -1 })
			.limit(limit)
			.skip(page * pageLength)
			.populate(defaultPostPopulation);

		const populatedPosts = await Promise.all(
			posts?.map((post) => getOtherPostData(post)),
		);

		res.status(200).json(populatedPosts);
	}),
];

// @desc    Get post by user friends
// @route   GET /posts/friends
// @access  Private
export const getPostsByUserFriends = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		const pageLength = 10;
		const limit = req.query.limit
			? parseInt(req.query.limit as string)
			: pageLength;
		const page = req.query.page ? parseInt(req.query.page as string) : 0;

		const fromQuery = {
			$or: [
				{ author: { $in: user.friends } },
				{ to: { $in: user.friends } },
				{ taggedUsers: { $elemMatch: { $in: user.friends } } },
			],
		};

		const posts = await Post.find({
			...fromQuery,
			audience: { $in: ["Friends", "Public"] },
		})
			.populate(defaultPostPopulation)
			.sort({ createdAt: -1 })
			.limit(limit)
			.skip(page * pageLength);

		const populatedPosts = await Promise.all(
			posts?.map((post) => getOtherPostData(post)),
		);

		res.status(200).json(populatedPosts);
	}),
];

// @desc    Get post by id
// @route   GET /posts/:id
// @access  Public
export const getPostById = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const post = await Post.findById(req.params.id).populate(
			defaultPostPopulation,
		);

		if (!post) {
			res.status(404).json({ message: "Post not found" });
			return;
		}

		const postsWithTopReactions = getPostAndCommentsTopReactions(post);

		res.status(200).json(postsWithTopReactions);
	},
);

// @desc    Create post
// @route   POST /posts
// @access  Private
export const createPost = [
	authenticateJwt,
	upload.array("unsavedMedia[]"),
	...postValidation,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			log(errors.array());
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const author = req.user as IUser;

		log(req.body);
		const post = new Post({
			author: author._id,
			...req.body,
		});

		if (req.files) {
			const files = req.files;

			const filesLength = files.length as number;
			if (filesLength > 10) {
				res
					.status(400)
					.json({ message: "You can only upload up to 10 photos." });
				return;
			}

			const resizedImages = await resizeImages(files);
			const imageLinks = await uploadFilesToCloudinary(resizedImages);
			post.media = imageLinks;
		}

		await post.save();

		const populatePost = await Post.findById(post._id).populate(
			defaultPostPopulation,
		);

		res.status(201).json(populatePost);
	}),
];

// @desc    Update post
// @route   PATCH /posts/:id
// @access  Private
export const updatePost = [
	authenticateJwt,
	upload.array("unsavedMedia[]"),
	...postValidation,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const user = req.user as IUser;

		const { audience, taggedUsers, content, feeling, sharedFrom, media } =
			req.body;

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

		post.checkIn = {
			location: req.body?.["checkIn.location"],
			city: req.body?.["checkIn.city"],
			state: req.body?.["checkIn.state"],
			country: req.body?.["checkIn.country"],
		};

		let imageLinks: string[] = [];
		if (req.files) {
			const files = req.files;

			const filesLength = files.length as number;
			if (filesLength > 10) {
				res
					.status(400)
					.json({ message: "You can only upload up to 10 photos." });
				return;
			}

			const resizedImages = await resizeImages(files);
			imageLinks = await uploadFilesToCloudinary(resizedImages);
			post.media = [...imageLinks, ...(media || [])];
		}

		post.audience = audience;
		post.taggedUsers = taggedUsers;
		post.content = content;
		post.feeling = feeling;
		post.sharedFrom = sharedFrom;
		post.media = post.media || [];

		await post.save();

		const populatePost = await Post.findByIdAndUpdate(post._id).populate(
			defaultPostPopulation,
		);

		res.status(200).json(populatePost);
	}),
];

// @desc    Update post audience
// @route   PATCH /posts/:id/audience
// @access  Private
export const updatePostAudience = [
	...postAudienceValidation,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			log(errors.array());
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const user = req.user as IUser;

		log(req.body);
		const { audience } = req.body;

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

		post.audience = audience;

		await post.save();

		const populatePost = await Post.findById(post._id).populate(
			defaultPostPopulation,
		);

		res.status(200).json(populatePost);
	}),
];

// @desc    Delete post
// @route   DELETE /posts/:id
// @access  Private
export const deletePost = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		const post = await Post.findById(req.params.id).select("author");
		if (!post) {
			res.status(404).json({ message: "Post not found" });
			return;
		}

		if (post.author.toString() !== user.id && user.userType !== "admin") {
			res.status(403).json({ message: "Unauthorized" });
			return;
		}

		await Post.findByIdAndDelete(req.params.id);

		await removeNotificationsFromDeletedPost(post._id, String(post.author));

		res.status(200).json({ message: "Post deleted", post });
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

		const post = (await Post.findById(req.params.id).populate(
			defaultPostPopulation,
		)) as IPost;

		if (!post) {
			res.status(404).json({ message: "Post not found" });
			return;
		}

		const existingReaction = await Reaction.findOne({
			parent: post._id,
			user: user._id,
		});

		if (!existingReaction) {
			const reaction = new Reaction({
				parent: post._id,
				user: user._id,
				type,
			});

			const savedReaction = await reaction.save();

			post.reactions.push(savedReaction._id);
		} else {
			existingReaction.type = type;
			await existingReaction.save();
		}

		await post.save();

		const notificationQuery = {
			to: post.author,
			type: "reaction",
			contentId: post._id,
			contentType: "post",
		};

		await createNotificationWithMultipleFrom({
			query: notificationQuery,
			from: user._id,
		});

		const populatedPost = await getOtherPostData(post);

		res.status(201).json(populatedPost);
	}),
];

// @desc    Unreact to post
// @route   DELETE /posts/:id/unreact
// @access  Private
export const unreactToPost = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		const post = (await Post.findById(req.params.id).populate(
			defaultPostPopulation,
		)) as IPost;

		if (!post) {
			res.status(404).json({ message: "Post not found" });
			return;
		}

		const existingReaction = await Reaction.findOne({
			parent: post._id,
			user: user._id,
		});

		if (!existingReaction) {
			res.status(404).json({ message: "User has not reacted to this comment" });
			return;
		}

		await Reaction.findByIdAndDelete(existingReaction._id);

		post.reactions = post.reactions.filter(
			(reaction) => reaction.toString() !== existingReaction._id.toString(),
		) as ObjectId[];

		await post.save();

		const notificationQuery = {
			to: post.author,
			type: "reaction",
			contentId: post._id,
			contentType: "post",
		};

		removeUserFromNotificationMultipleFrom({
			query: notificationQuery,
			remove: user._id,
		});

		const populatedPost = await getOtherPostData(post);

		res.status(200).json(populatedPost);
	}),
];

// @desc    Get post reactions
// @route   GET /posts/:id/reactions
// @access  Public
export const getPostReactions = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const post = await Post.findById(req.params.id);
		if (!post) {
			res.status(404).json({ message: "Post not found" });
			return;
		}

		const reactions = await Reaction.find({ parent: post._id })
			.populate("user", "fullName isDeleted avatarUrl")
			.sort({ createdAt: -1 });

		res.status(200).json({ reactions });
	},
);

// @desc    Get post photos
// @route   GET /posts/:id/photos
// @access  Public
export const getPostPhotos = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const post = await Post.findById(req.params.id).select("media").lean();

		if (!post) {
			res.status(404).json({ message: "Post not found" });
			return;
		}

		const photos = post.media || [];

		res.status(200).json(photos);
	},
);

// @desc    Toggle saved post
// @route   PATCH /posts/:id/save
// @access  Private
export const toggleSavedPost = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		const post = await Post.findById(req.params.id);
		if (!post) {
			res.status(404).json({ message: "Post not found" });
			return;
		}

		const postId = post._id as ObjectId;

		const isPostSaved = user.savedPosts.some(
			(savedPost) => String(savedPost) === String(postId),
		);

		const updateOperation = isPostSaved
			? { $pull: { savedPosts: postId } }
			: { $addToSet: { savedPosts: postId } };

		const userUpdated = await User.findByIdAndUpdate(
			user._id,
			updateOperation,
			{ new: true },
		).select("savedPosts");

		res.status(200).json(userUpdated?.savedPosts);
	}),
];

// @desc    Get saved posts
// @route   GET /posts/saved-posts
// @access  Private
export const getSavedPosts = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		const posts = await Post.find({ _id: { $in: user.savedPosts } })
			.populate("author", "fullName isDeleted avatarUrl")
			.sort({ createdAt: -1 });

		res.status(200).json({ posts });
	}),
];

// @desc    Share post
// @route   POST /posts/:id/share
// @access  Private
export const sharePost = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

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
	}),
];