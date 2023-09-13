import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { ValidationChain, body, validationResult } from "express-validator";
import debug from "debug";

import User from "../models/user.model";
import { IUser } from "../../types/IUser";
import Post from "../models/post.model";
import Comment from "../models/comment.model";
import validateAndFormatUsername from "./utils/validateAndFormatUsername";
import { authenticateJwt } from "../middleware/authenticateJwt";
import { uploadFileToCloudinary } from "../utils/uploadToCloudinary";
import { resizeImage } from "../utils/resizeImages";
import upload from "../config/multer";
import removeFromCloudinary from "../utils/removeFromCloudinary";
import hobbiesBank from "../models/data/hobbies";

const log = debug("log:user:controller");

// @desc    Get all users
// @route   GET /users
// @access  Public
export const getUsers = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const usersTotal = await User.countDocuments({ isDeleted: false });
		const users = await User.find({ isDeleted: false })
			.limit(req.query.limit ? parseInt(req.query.limit as string) : 0)
			.skip(req.query.offset ? parseInt(req.query.offset as string) : 0)
			.sort({ createdAt: -1 });

		res.status(200).json({ users, meta: { total: usersTotal } });
	},
);

// @desc    Get user by id
// @route   GET /users/:id
// @access  Public
export const getUserById = expressAsyncHandler(
	async (req: Request, res: Response) => {
		// TODO turn into middleware
		const isValidObjectId = (id: string) => {
			return /^[a-fA-F0-9]{24}$/.test(id);
		};

		if (!isValidObjectId(req.params.id)) {
			res.status(400).json({ message: "User not found" });
			return;
		}
		// TODO: add other necessary fields, populate data
		const [user, posts, comments] = await Promise.all([
			User.findById(req.params.id),
			Post.find({ published: true, author: req.params.id }),
			Comment.find({ author: req.params.id }),
		]);

		if (user?.isDeleted) {
			res
				.status(403)
				.json({ isDeleted: true, message: "This user has been deleted." });
			return;
		}

		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		const userWithCommentsPosts = { ...user?.toJSON(), posts, comments };
		res.status(200).json(userWithCommentsPosts);
	},
);

// @desc    Get deleted user by id
// @route   GET /users/:id/deleted
// @access  Admin
export const getDeletedUserById = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const loggedInUser = req.user as IUser;
		if (loggedInUser.userType !== "admin") {
			res.status(403).json({ message: "Unauthorized" });
			return;
		}

		// TODO adjust populate
		const [user, posts, comments] = await Promise.all([
			User.findById(req.params.id).populate({
				path: "deletedData.deletedBy",
				select: "firstName lastName",
			}),
			Post.find({ published: true, author: req.params.id }),
			Comment.find({ author: req.params.id }),
		]);

		res.status(200).json({ user, posts, comments });
	}),
];

// @desc    Create user
// @route   POST /users
// @access  Admin
export const createUser = [
	authenticateJwt,
	body("firstName")
		.trim()
		.notEmpty()
		.withMessage("First name is required and should not be empty"),
	body("lastName")
		.trim()
		.notEmpty()
		.withMessage("Last name is required and should not be empty"),
	body("username")
		.trim()
		.notEmpty()
		.withMessage(
			"Username id is required and should be a valid email or phone number",
		),
	body("password")
		.trim()
		.notEmpty()
		.isLength({ min: 8 })
		.withMessage("Password should be at least 8 characters long")
		.matches(
			/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*?()])[A-Za-z\d!@#$%^&*?()]{8,}$/,
			"i",
		)
		.withMessage(
			"Password must contain at least one uppercase letter, one lowercase letter, one special character, one number, and be at least 8 characters long",
		),
	body("birthday")
		.trim()
		.notEmpty()
		.isISO8601()
		.withMessage(
			"Birthday is required and should be a valid date in ISO 8601 format",
		),
	body("pronouns")
		.optional()
		.trim()
		.notEmpty()
		.withMessage("Pronouns should not be empty if provided"),
	body("userType")
		.trim()
		.isIn(["admin", "user"])
		.withMessage("User type must be either admin or user"),
	expressAsyncHandler(async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array(), reqBody: req.body });
			return;
		}

		const reqUser = req.user as IUser;
		if (reqUser.userType !== "admin") {
			res.status(403).json({ message: "Unauthorized" });
			return;
		}

		const { firstName, password, lastName, birthday, username, userType } =
			req.body;

		const { usernameType, formattedUsername } =
			validateAndFormatUsername(username);

		const userExists = await User.findOne({
			[usernameType]: formattedUsername,
		});
		if (userExists) {
			res
				.status(400)
				.json({ message: "User with this email/phone already exists" });
			return;
		}

		const user = new User({
			firstName,
			lastName,
			password,
			birthday: new Date(birthday),
			pronouns: req.body?.pronouns ?? undefined,
			[usernameType]: username,
			verification: {
				isVerified: false,
				type: usernameType,
			},
			userType,
		});

		await user.save();

		res.status(201).json({ message: "User created successfully", user });
	}),
];

// @desc    Update user password
// @route   PATCH /users/:id/password
// @access  Admin
export const updateUserPassword = [
	authenticateJwt,
	body("newPassword")
		.notEmpty()
		.trim()
		.isLength({ min: 8 })
		.withMessage("Password should be at least 8 characters long")
		.matches(
			/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*?()])[A-Za-z\d!@#$%^&*?()]{8,}$/,
			"i",
		)
		.withMessage(
			"Password must contain at least one uppercase letter, one lowercase letter, one special character, one number, and be at least 8 characters long",
		),
	expressAsyncHandler(async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const reqUser = req.user as IUser;

		if (reqUser.userType !== "admin") {
			res.status(403).json({ message: "Unauthorized" });
			return;
		}

		const user = await User.findById(req.params.id);
		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		user.password = req.body.newPassword;
		await user.save();

		res.status(201).json({ message: "Password updated successfully" });
	}),
];

type UserImageField = "avatarUrl" | "coverPhotoUrl";

const updateUserImage = (
	fieldToUpdate: UserImageField,
	imageDimensions: { width: number; height: number },
) => [
	authenticateJwt,
	upload.single("file"),
	expressAsyncHandler(async (req: Request, res: Response) => {
		const reqUser = req.user as IUser;
		const userId = String(req.params.id);

		if (userId !== reqUser.id && reqUser.userType !== "admin") {
			res.status(403).json({ message: "Unauthorized" });
			return;
		}

		const file = req.file;
		if (!file) {
			res.status(400).json({ message: "No file provided" });
			return;
		}

		const user = (await User.findById(userId)) as IUser;
		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		const prevImageUrl = user[fieldToUpdate];

		const resizedImage = await resizeImage(file, imageDimensions);
		const imageLink = await uploadFileToCloudinary(resizedImage);
		user[fieldToUpdate] = imageLink;

		await user.save();

		if (prevImageUrl) {
			await removeFromCloudinary(prevImageUrl);
		}

		res.status(201).json({
			message: `${fieldToUpdate.replace("Url", " ")}updated successfully`,
			user,
		});
	}),
];

// @desc    Update user profile photo
// @route   PATCH /users/:id/profile-photo
// @access  Private
export const updateUserProfilePhoto = updateUserImage("avatarUrl", {
	width: 128,
	height: 128,
});

// @desc    Update user cover photo
// @route   PATCH /users/:id/cover-photo
// @access  Private
export const updateUserCoverPhoto = updateUserImage("coverPhotoUrl", {
	width: 1280,
	height: 720,
});

type UserStandardField = "bio" | "hobbies" | "intro";

interface UserStandardFieldParams {
	fieldToUpdate: UserStandardField;
	validationRules: ValidationChain[] | undefined;
	useBodyDirectly?: boolean;
}

const updateUserStandardField = ({
	fieldToUpdate,
	validationRules = [],
	useBodyDirectly,
}: UserStandardFieldParams) => [
	authenticateJwt,
	...validationRules,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const reqUser = req.user as IUser;
		const userId = String(req.params.id);

		if (userId !== reqUser.id && reqUser.userType !== "admin") {
			res.status(403).json({ message: "Unauthorized" });
			return;
		}

		const user = (await User.findById(userId)) as IUser;
		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		user[fieldToUpdate] = useBodyDirectly ? req.body : req.body[fieldToUpdate];

		log(user[fieldToUpdate]);
		await user.save();

		res
			.status(201)
			.json({ message: `${fieldToUpdate} updated successfully`, user });
	}),
];

// @desc    Update user bio
// @route   PATCH /users/:id/bio
// @access  Private
export const updateUserBio = updateUserStandardField({
	fieldToUpdate: "bio",
	validationRules: [
		body("bio")
			.trim()
			.notEmpty()
			.withMessage("Bio should not be empty")
			.isLength({ max: 101 })
			.withMessage("Bio should not be longer than 101 characters"),
	],
});

// @desc    Update user hobbies
// @route   PATCH /users/:id/hobbies
// @access  Private
export const updateUserHobbies = updateUserStandardField({
	fieldToUpdate: "hobbies",
	validationRules: [
		body("hobbies")
			.isArray({ min: 1 })
			.withMessage("Hobbies should be an array of at least one hobby")
			.custom((hobbies) =>
				hobbies.every(
					(hobby: string) => !!hobbiesBank.find((h) => h.name === hobby),
				),
			)
			.withMessage("Hobbies should be valid hobbies"),
	],
});

// @desc    Update user intro
// @route   PATCH /users/:id/intro
// @access  Private
export const updateUserIntro = updateUserStandardField({
	fieldToUpdate: "intro",
	validationRules: [],
	useBodyDirectly: true,
});

// @desc    Get user posts & tagged posts with photos
// @route   GET /users/:id/photos
// @access  Public
export const getUserPhotos = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const userId = String(req.params.id);
		const posts = await Post.find({
			$or: [{ author: userId }, { taggedUsers: userId }],
			media: {
				$exists: true,
				$ne: [] || null,
				$elemMatch: { type: "image" },
			},
		})
			.select("media")
			.limit(req.query.limit ? parseInt(req.query.limit as string) : 0);

		const photos = posts.reduce((acc, post) => {
			if (post.media && post.media.length > 0) {
				post.media.forEach((mediaItem) => {
					if (mediaItem.type !== "image") return;
					acc.push({ media: mediaItem.url, postId: post._id });
				});
			}
			return acc;
		}, [] as { media: string; postId: string }[]);

		res.status(200).json(photos);
	},
);

// @desc    Update user basic info
// @route   PATCH /users/:id/basic
// @access  Private
export const updateUserBasicInfo = [
	authenticateJwt,
	body("firstName")
		.trim()
		.notEmpty()
		.withMessage("First name is required and should not be empty"),
	body("lastName")
		.trim()
		.notEmpty()
		.withMessage("Last name is required and should not be empty"),
	body("phoneNumber")
		.optional()
		.trim()
		.notEmpty()
		.withMessage(
			"phoneNumber should not be empty if provided and should be a valid phone number",
		),
	body("email")
		.optional()
		.trim()
		.notEmpty()
		.withMessage(
			"Email should not be empty if provided and should be a valid email",
		),
	body("birthday")
		.trim()
		.notEmpty()
		.isISO8601()
		.withMessage(
			"Birthday is required and should be a valid date in ISO 8601 format",
		),
	body("pronouns")
		.optional()
		.trim()
		.notEmpty()
		.withMessage("Pronouns should not be empty if provided"),
	body("userType")
		.trim()
		.isIn(["admin", "user"])
		.withMessage("User type must be either admin or user"),
	expressAsyncHandler(async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const reqUser = req.user as IUser;

		const userId = String(req.params.id);
		if (String(reqUser._id) !== userId && reqUser.userType !== "admin") {
			res.status(403).json({ message: "Unauthorized" });
			return;
		}

		const user = await User.findById(userId);

		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		user.set(req.body);
		const updatedUser = await user.save();

		res.status(201).json({ updatedUser, message: "User updated successfully" });
	}),
];

// @desc    Get user posts
// @route   GET /users/:id/posts
// @access  Public
export const getUserPosts = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const user = await User.findById(req.params.id);
		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		if (user.isDeleted) {
			res.status(404).json({ message: "User has been deleted" });
			return;
		}

		const postCount = await Post.countDocuments({ author: req.params.id });
		const posts = await Post.find({ author: req.params.id })
			.skip(req.query.offset ? parseInt(req.query.offset as string) : 0)
			.limit(req.query.limit ? parseInt(req.query.limit as string) : 0)
			.sort({ createdAt: -1 });

		res.status(200).json({
			posts,
			message: "Posts retrieved successfully",
			meta: { total: postCount },
		});
	},
);

// @desc    Get user friends
// @route   GET /users/:id/friends
// @access  Public
export const getUserFriends = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const user = await User.findById(req.params.id)
			.populate("friends", "avatarUrl firstName lastName")
			.select("friends isDeleted")
			.limit(req.query.limit ? parseInt(req.query.limit as string) : 0);

		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		if (user.isDeleted) {
			res.status(404).json({ message: "User has been deleted" });
			return;
		}

		res.status(200).json(user.friends);
	},
);

// @desc    Get user saved posts
// @route   GET /users/:id/saved-posts
// @access  Private
export const getUserSavedPosts = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		const userId = String(req.params.id);
		if (userId !== user.id && user.userType !== "admin") {
			res.status(403).json({ message: "Unauthorized" });
			return;
		}

		const userSavedPosts = await User.findOne({
			_id: userId,
			isDeleted: false,
		})
			.populate({
				path: "savedPosts",
				populate: [
					{
						path: "author",
						select: "firstName lastName isDeleted",
					},
				],
			})
			.select("savedPosts isDeleted")
			.sort({ createdAt: -1 })
			.exec();

		if (!userSavedPosts) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		const savedPostsCount = userSavedPosts.savedPosts.length;
		const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
		const limit = req.query.limit
			? parseInt(req.query.limit as string)
			: userSavedPosts.savedPosts.length;

		const savedPostsWithLimitOffset = userSavedPosts.savedPosts.slice(
			offset,
			offset + limit,
		);

		res.status(200).json({
			message: "Saved posts retrieved successfully",
			savedPosts: savedPostsWithLimitOffset,
			meta: { total: savedPostsCount },
		});
	}),
];

// @desc    Send friend request
// @route   POST /users/:id/friend-requests
// @access  Private
export const sendFriendRequest = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const reqUser = req.user as IUser;

		const userId = String(req.params.id);
		if (String(reqUser._id) === userId) {
			res
				.status(400)
				.json({ message: "You cannot send a friend request to yourself" });
			return;
		}

		const userToFollow = await User.findById(userId);
		if (!userToFollow || userToFollow.isDeleted) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		const userAlreadyFriended = userToFollow.friends.includes(reqUser._id);
		if (userAlreadyFriended) {
			res.status(400).json({ message: "Already friends with user" });
			return;
		}

		const userAlreadySentRequest =
			userToFollow.friendRequestsReceived.includes(reqUser._id) ||
			reqUser.friendRequestsSent.includes(userToFollow._id);
		if (userAlreadySentRequest) {
			res.status(400).json({ message: "Friend request already sent" });
			return;
		}

		userToFollow.friendRequestsReceived.push(reqUser._id);
		await userToFollow.save();

		await User.findByIdAndUpdate(reqUser._id, {
			$addToSet: { friendRequestsSent: userToFollow._id },
		});

		res.status(200).json({ message: "Friend request sent successfully" });
	}),
];

// @desc    Remove friend
// @route   DELETE /users/me/friends/:friendId
// @access  Private
export const unfriendUser = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const reqUser = req.user as IUser;
		const userToUnfriendId = String(req.params.friendId);

		if (String(reqUser._id) === userToUnfriendId) {
			res.status(400).json({ message: "Cannot remove self as friend" });
			return;
		}

		const userToRemove = await User.findById(userToUnfriendId);

		if (!userToRemove || userToRemove.isDeleted) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		const userAlreadyRemoved = !userToRemove.friends.includes(reqUser._id);
		if (userAlreadyRemoved) {
			res.status(400).json({ message: "Already not friends with user" });
			return;
		}

		const userToRemoveIndex = userToRemove.friends.indexOf(reqUser._id);
		userToRemove.friends.splice(userToRemoveIndex, 1);
		await userToRemove.save();

		const updatedFriendsList = await User.findByIdAndUpdate(
			reqUser._id,
			{
				$pull: { friends: userToRemove._id },
			},
			{ new: true },
		).select("friends");

		res.status(200).json({
			message: "Friend removed successfully",
			updatedFriendsList,
		});
	}),
];

// @desc    Accept friend request
// @route   POST /users/me/friend-requests/:requestId/accept
// @access  Private
export const acceptFriendRequest = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const reqUser = req.user as IUser;

		const requestId = String(req.params.requestId);

		const userToAccept = await User.findById(requestId);
		if (!userToAccept || userToAccept.isDeleted) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		const userAlreadyFriended =
			userToAccept.friends.includes(reqUser._id) ||
			reqUser.friends.includes(userToAccept._id);
		if (userAlreadyFriended) {
			res.status(400).json({ message: "Already friends with user" });
			return;
		}

		const userToAcceptRequestIndex = userToAccept.friendRequestsSent.findIndex(
			(request) => String(request) === reqUser.id,
		);

		const reqUserRequestIndex = reqUser.friendRequestsReceived.findIndex(
			(request) => String(request) === requestId,
		);

		if (userToAcceptRequestIndex === -1 || reqUserRequestIndex === -1) {
			res.status(404).json({ message: "Friend request not found" });
			return;
		}

		const updatedUser = (await User.findByIdAndUpdate(
			reqUser._id,
			{
				$pull: { friendRequestsReceived: requestId },
				$addToSet: { friends: userToAccept._id },
			},
			{ new: true },
		).select("friends friendRequestsReceived")) as IUser;

		const updatedOtherUser = (await User.findByIdAndUpdate(
			userToAccept._id,
			{
				$pull: { friendRequestsSent: reqUser._id },
				$addToSet: { friends: reqUser._id },
			},
			{ new: true },
		).select("friends friendRequestsSent")) as IUser;

		res.status(200).json({
			message: "Friend request accepted successfully",
			myUpdatedFriendsList: updatedUser.friends,
			myUpdatedFriendRequestsReceived: updatedUser.friendRequestsReceived,
			otherUserUpdatedFriendsList: updatedOtherUser.friends,
			otherUserUpdatedFriendRequestsSent: updatedOtherUser.friendRequestsSent,
		});
	}),
];

// @desc    Reject friend request
// @route   POST /users/me/friend-requests/:requestId/reject
// @access  Private
export const rejectFriendRequest = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const reqUser = req.user as IUser;
		const requestId = String(req.params.requestId);

		const userToReject = await User.findById(requestId);
		if (!userToReject || userToReject.isDeleted) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		const userAlreadyFriended =
			userToReject.friends.includes(reqUser._id) ||
			reqUser.friends.includes(userToReject._id);
		if (userAlreadyFriended) {
			res.status(400).json({ message: "Already friends with user" });
			return;
		}

		const userToRejectRequestIndex = userToReject.friendRequestsSent.findIndex(
			(request) => String(request) === reqUser.id,
		);
		const reqUserRequestIndex = reqUser.friendRequestsReceived.findIndex(
			(request) => String(request) === requestId,
		);
		if (userToRejectRequestIndex === -1 || reqUserRequestIndex === -1) {
			res.status(404).json({ message: "Friend request not found" });
			return;
		}

		const myUpdatedFriendRequestsReceived = await User.findByIdAndUpdate(
			reqUser._id,
			{
				$pull: { friendRequestsReceived: requestId },
			},
			{ new: true },
		).select("friendRequestsReceived");
		const otherUserUpdatedFriendRequestsSent = await User.findByIdAndUpdate(
			userToReject._id,
			{
				$pull: { friendRequestsSent: reqUser._id },
			},
			{ new: true },
		).select("friendRequestsSent");

		res.status(200).json({
			message: "Friend request rejected successfully",
			myUpdatedFriendRequestsReceived,
			myUpdatedFriendsList: reqUser.friends,
			otherUserUpdatedFriendRequestsSent,
			otherUserUpdatedFriendsList: userToReject.friends,
		});
	}),
];

// TODO all of the specific update routes -> gonna do while i do the front end
