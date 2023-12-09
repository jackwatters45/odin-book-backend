import { validationResult } from "express-validator";
import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import debug from "debug";

import Post, { IPost } from "../../models/post.model";
import User, { IUser } from "../../models/user.model";
import Reaction from "../../models/reaction.model";

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
import { removeNotificationsFromDeletedPost } from "../notifications/utils/removeNotificationsFromDeletedPost";
import { createNotificationWithMultipleFrom } from "../notifications/utils/createNotificationWithMultipleFrom";
import { removeUserFromNotificationMultipleFrom } from "../notifications/utils/removeUserFromNotificationMultipleFrom";
import postReactionValidation from "./validations/postReactionValidation";

const log = debug("log:post:controller");

// @desc    Get all posts
// @route   GET /posts
// @access  Private
export const getPosts = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const pageLength = 5;
		const limit = req.query.limit
			? parseInt(req.query.limit as string)
			: pageLength;
		const page = req.query.page ? parseInt(req.query.page as string) : 0;

		const [posts, postsCount] = await Promise.all([
			Post.find()
				.sort({ createdAt: -1 })
				.limit(limit)
				.skip(page * pageLength)
				.populate(defaultPostPopulation)
				.lean(),
			Post.countDocuments(),
		]);

		res.status(200).json({ posts, meta: { total: postsCount } });
	},
);

// @desc    Get user posts
// @route   GET /users/:id/posts
// @access  Private
export const getUserPosts = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const reqUser = req.user as IUser;

		const pageLength = 20;
		const limit = req.query.limit
			? parseInt(req.query.limit as string)
			: pageLength;
		const page = req.query.page ? parseInt(req.query.page as string) : 0;

		const user = await User.findOne({
			_id: req.params.id,
			isDeleted: false,
		}).lean();
		if (!user) {
			res.status(404).json({ message: "User not found or has been deleted" });
			return;
		}

		const isSelf = String(reqUser._id) === String(user._id);
		const isFriends = reqUser.friends.includes(user._id);

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
			.populate(defaultPostPopulation)
			.lean();

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
			.sort({ createdAt: -1 })
			.limit(limit)
			.skip(page * pageLength)
			.populate(defaultPostPopulation)
			.lean();

		const populatedPosts = await Promise.all(
			posts?.map((post) => getOtherPostData(post)),
		);

		res.status(200).json(populatedPosts);
	}),
];

// @desc    Get post by id
// @route   GET /posts/:id
// @access  Private
export const getPostById = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const post = await Post.findById(req.params.id)
			.populate(defaultPostPopulation)
			.lean();

		if (!post) {
			res.status(404).json({ message: "Post not found" });
			return;
		}

		const postsWithTopReactions = await getPostAndCommentsTopReactions(post);

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
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const author = req.user as IUser;

		const post = await Post.create({
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

		const populatePost = await Post.findById(post._id)
			.populate(defaultPostPopulation)
			.lean();

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

		const post = await Post.findById(req.params.id).select("author");
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

		const populatePost = await Post.findById(post._id)
			.populate(defaultPostPopulation)
			.lean();

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
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const user = req.user as IUser;

		const { audience } = req.body;

		const post = await Post.findById(req.params.id).populate(
			defaultPostPopulation,
		);

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

		res.status(200).json(post);
	}),
];

// @desc    Delete post
// @route   DELETE /posts/:id
// @access  Private
export const deletePost = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		const post = await Post.findById(req.params.id).select("author").lean();
		if (!post) {
			res.status(404).json({ message: "Post not found" });
			return;
		}

		if (post.author.toString() !== user.id && user.userType !== "admin") {
			res.status(403).json({ message: "Unauthorized" });
			return;
		}

		await Promise.all([
			Post.findByIdAndDelete(req.params.id),
			removeNotificationsFromDeletedPost(post._id, String(post.author)),
		]);

		res.status(200).json({ message: "Post deleted" });
	}),
];

// @desc    React to post
// @route   PATCH /posts/:id/react
// @access  Private
export const reactToPost = [
	authenticateJwt,
	...postReactionValidation,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const user = req.user as IUser;
		const postId = req.params.id;
		const type = req.body.type;

		const existingReaction = await Reaction.findOne({
			parent: postId,
			user: user._id,
		});

		if (!existingReaction) {
			const reaction = new Reaction({
				parent: postId,
				user: user._id,
				type,
			});

			const savedReaction = await reaction.save();

			await Post.findByIdAndUpdate(postId, {
				$push: { reactions: savedReaction._id },
			});
		} else {
			existingReaction.type = type;
			await existingReaction.save();
		}

		const post = (await Post.findById(postId).populate(
			defaultPostPopulation,
		)) as IPost;

		if (!post) {
			res.status(404).json({ message: "Post not found" });
			return;
		}

		const notificationQuery = {
			to: (post.author as IUser)._id,
			type: "reaction",
			contentId: post._id,
			contentType: "post",
		};

		const [populatedPost] = await Promise.all([
			getOtherPostData(post),
			createNotificationWithMultipleFrom({
				query: notificationQuery,
				from: user._id,
			}),
		]);

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
		const postId = req.params.id;

		const existingReaction = await Reaction.findOne({
			parent: postId,
			user: user._id,
		});

		if (!existingReaction) {
			res.status(404).json({ message: "User has not reacted to this comment" });
			return;
		}

		await Reaction.findByIdAndDelete(existingReaction._id);

		const post = (await Post.findByIdAndUpdate(
			postId,
			{ $pull: { reactions: existingReaction._id } },
			{ new: true },
		).populate(defaultPostPopulation)) as IPost;

		if (!post) {
			res.status(404).json({ message: "Post not found" });
			return;
		}

		const notificationQuery = {
			to: post.author,
			type: "reaction",
			contentId: post._id,
			contentType: "post",
		};

		const [populatedPost] = await Promise.all([
			getOtherPostData(post),
			removeUserFromNotificationMultipleFrom({
				query: notificationQuery,
				remove: user._id,
			}),
		]);

		res.status(200).json(populatedPost);
	}),
];

// @desc    Get post reactions
// @route   GET /posts/:id/reactions
// @access  Private
export const getPostReactions = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const post = await Post.exists({ _id: req.params.id }).lean();
		if (!post) {
			res.status(404).json({ message: "Post not found" });
			return;
		}

		const reactions = await Reaction.find({ parent: post._id })
			.populate("user", "fullName isDeleted avatarUrl")
			.sort({ createdAt: -1 })
			.lean();

		res.status(200).json({ reactions });
	},
);

// @desc    Get post photos
// @route   GET /posts/:id/photos
// @access  Private
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

		const isPostSaved = user.savedPosts.includes(post._id);

		const updateOperation = isPostSaved
			? { $pull: { savedPosts: post._id } }
			: { $addToSet: { savedPosts: post._id } };

		const userUpdated = await User.findByIdAndUpdate(
			user._id,
			updateOperation,
			{ new: true },
		)
			.select("savedPosts")
			.lean();

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
			.sort({ createdAt: -1 })
			.populate(defaultPostPopulation)
			.lean();

		res.status(200).json({ posts });
	}),
];
