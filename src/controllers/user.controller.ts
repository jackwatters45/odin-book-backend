import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import debug from "debug";

import User from "../models/user.model";
import { IUser } from "../../types/IUser";
import Post from "../models/post.model";
import Comment from "../models/comment.model";
import { authenticateJwt } from "../middleware/authConfig";

const log = debug("log:user:controller");
const errorLog = debug("error:user:controller");

// @desc    Get all users
// @route   GET /users
// @access  Public
export const getUsers = expressAsyncHandler(
	async (req: Request, res: Response) => {
		try {
			const usersTotal = await User.countDocuments({ isDeleted: false });
			const users = await User.find({ isDeleted: false }, { password: 0 })
				.limit(req.query.limit ? parseInt(req.query.limit as string) : 0)
				.skip(req.query.offset ? parseInt(req.query.offset as string) : 0)
				.sort({ createdAt: -1 });

			res.status(200).json({ users, meta: { total: usersTotal } });
		} catch (error) {
			errorLog(error);
			res.status(500).json({ message: error.message });
		}
	},
);

// @desc    Get user by id
// @route   GET /users/:id
// @access  Public
export const getUserById = expressAsyncHandler(
	async (req: Request, res: Response) => {
		try {
			// TODO: add other necessary fields, populate data
			const [user, posts, comments] = await Promise.all([
				User.findById(req.params.id, { password: 0 }),
				Post.find({ published: true, author: req.params.id }),
				Comment.find({ author: req.params.id }),
			]);

			if (user?.isDeleted) {
				res
					.status(403)
					.json({ isDeleted: true, message: "This user has been deleted." });
				return;
			}

			res.status(200).json({ user, posts, comments });
		} catch (error) {
			errorLog(error);
			res.status(500).json({ message: error.message });
		}
	},
);

// @desc    Get deleted user by id
// @route   GET /users/:id/deleted
// @access  Admin
export const getDeletedUserById = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		if (user.userType !== "admin") {
			res.status(403).json({ message: "Unauthorized" });
			return;
		}

		try {
			// TODO adjust populate
			const [user, posts, comments] = await Promise.all([
				User.findById(req.params.id, { password: 0 }).populate({
					path: "deletedData.deletedBy",
					select: "firstName lastName",
				}),
				Post.find({ published: true, author: req.params.id }),
				Comment.find({ author: req.params.id }),
				// .populate({
				// 	path: "post",
				// 	select: "title",
				// 	populate: {
				// 		path: "author",
				// 		select: "firstName lastName",
				// 	},
				// }),
			]);

			res.status(200).json({ user, posts, comments });
		} catch (error) {
			errorLog(error);
			res.status(500).json({ message: error.message });
		}
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

		try {
			const { firstName, password, lastName, birthday, username, userType } =
				req.body;

			const idType = username.includes("@") ? "email" : "phoneNumber";

			const userExists = await User.findOne({ [idType]: username });
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
				[idType]: username,
				verification: {
					isVerified: false,
					type: idType,
				},
				userType,
			});

			await user.save();

			res.status(201).json({ message: "User created successfully", user });
		} catch (err) {
			errorLog(err);
			res.status(500).json({ message: err.message });
		}
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
	body("confirmPassword")
		.notEmpty()
		.trim()
		.custom((confirmPassword, { req }) => {
			if (confirmPassword !== req.body.newPassword) {
				throw new Error("Passwords do not match");
			}
			return true;
		}),
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

		try {
			const user = await User.findById(req.params.id);
			if (!user) {
				res.status(404).json({ message: "User not found" });
				return;
			}

			user.password = req.body.newPassword;
			await user.save();

			res.status(201).json({ message: "Password updated successfully" });
		} catch (error) {
			errorLog(error);
			res.status(500).json({ message: error.message });
		}
	}),
];

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

		try {
			const user = await User.findById(userId);

			if (!user) {
				res.status(404).json({ message: "User not found" });
				return;
			}

			user.set(req.body);
			const updatedUser = await user.save();

			res
				.status(201)
				.json({ updatedUser, message: "User updated successfully" });
		} catch (error) {
			errorLog(error);
			res.status(500).json({ message: error.message });
		}
	}),
];

// @desc    Get user posts
// @route   GET /users/:id/posts
// @access  Public
export const getUserPosts = expressAsyncHandler(
	async (req: Request, res: Response) => {
		try {
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
		} catch (error) {
			errorLog(error);
			res.status(500).json({ message: error.message });
		}
	},
);

// @desc    Get user friends
// @route   GET /users/:id/friends
// @access  Public
export const getUserFriends = expressAsyncHandler(
	async (req: Request, res: Response) => {
		try {
			const user = await User.findById(req.params.id)
				.populate("friends", "-password -email -phoneNumber")
				.select("friends isDeleted");

			if (!user) {
				res.status(404).json({ message: "User not found" });
				return;
			}

			if (user.isDeleted) {
				res.status(404).json({ message: "User has been deleted" });
				return;
			}

			res.status(200).json({
				friends: user.friends,
				message: "Friends retrieved successfully",
			});
		} catch (error) {
			errorLog(error);
			res.status(500).json({ message: error.message });
		}
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

		try {
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
			const offset = req.query.offset
				? parseInt(req.query.offset as string)
				: 0;
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
		} catch (error) {
			errorLog(error);
			res.status(500).json({ message: error.message });
		}
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

		try {
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
		} catch (error) {
			errorLog(error);
			res.status(500).json({ message: error.message });
		}
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

		try {
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
		} catch (error) {
			errorLog(error);
			res.status(500).json({ message: error.message });
		}
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
		try {
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

			const userToAcceptRequestIndex =
				userToAccept.friendRequestsSent.findIndex(
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
		} catch (error) {
			errorLog(error);
			res.status(500).json({ message: error.message });
		}
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

		try {
			const userToReject = await User.findById(requestId, { password: 0 });
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

			const userToRejectRequestIndex =
				userToReject.friendRequestsSent.findIndex(
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
		} catch (error) {
			errorLog(error);
			res.status(500).json({ message: error.message });
		}
	}),
];

// TODO all of the specific update routes -> gonna do while i do the front end
