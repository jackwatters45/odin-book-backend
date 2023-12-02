import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { ValidationChain, body, validationResult } from "express-validator";
import { ObjectId, Schema, isValidObjectId } from "mongoose";
import debug from "debug";

import User, { IUser } from "../../models/user.model";
import Post from "../../models/post.model";
import Comment from "../../models/comment.model";
import validateAndFormatUsername from "../../utils/validateAndFormatUsername";
import authenticateJwt from "../../middleware/authenticateJwt";
import { uploadFileToCloudinary } from "../../utils/uploadToCloudinary";
import { resizeImage } from "../../utils/resizeImages";
import upload from "../../config/multer";
import { IRelationshipStatus } from "../../../types/relationshipStatus";

import {
	processDateValues,
	adjustEndDateForCurrent,
	removeFromCloudinary,
	processEducationValues,
	encodeWebsiteId,
} from "./utils";

import {
	audienceSettingsValidation,
	bioValidation,
	hobbiesValidation,
	introValidation,
	phoneNumberValidation,
	emailValidation,
	genderValidation,
	pronounsValidation,
	languagesValidation,
	familyMemberValidations,
	relationshipValidations,
	websiteValidation,
	socialLinksValidation,
	placesLivedValidation,
	educationValidation,
	workValidation,
	aboutYouValidation,
	namePronunciationValidation,
	birthdayValidation,
	favoriteQuotesValidation,
	otherNamesValidation,
} from "./validations";

import validateBirthdayDate from "../../utils/validateBirthdayDate";
import {
	createNotificationForAcceptedFriendRequest,
	createNotificationForFriendRequest,
	removeNotificationForFriendRequest,
} from "../notifications/notification.controller";
import { IWork } from "../../../types/work";
import { IPlaceLived } from "../../../types/placesLived";

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

// all user about routes use this projection
const userDefaultPopulation = [
	{
		path: "familyMembers.user",
		select: "avatarUrl fullName",
	},
	{
		path: "relationshipStatus.user",
		select: "avatarUrl fullName",
	},
];

const getMutualFriendIds = (userA: IUser, userB: IUser) => {
	const extractId = (item: ObjectId | Partial<IUser>): string =>
		item instanceof Schema.Types.ObjectId
			? item.toString()
			: item?._id.toString();

	const userAFriendsIds = userA.friends.map(extractId);
	const userBFriendsSet = new Set(userB.friends.map(extractId));

	return userAFriendsIds.filter((friendId) => userBFriendsSet.has(friendId));
};

// @desc    Get user by id
// @route   GET /users/:id
// @access  Public
export const getUserById = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const reqUser = req.user as IUser;

		if (!isValidObjectId(req.params.id)) {
			res.status(400).json({ message: "User not found" });
			return;
		}

		const [user, posts, comments] = await Promise.all([
			User.findById(req.params.id).populate(userDefaultPopulation),
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

		const mutualFriends = reqUser ? getMutualFriendIds(reqUser, user) : [];

		const userWithCommentsPosts = {
			...user?.toJSON(),
			posts,
			comments,
			mutualFriends,
		};
		res.status(200).json(userWithCommentsPosts);
	}),
];

// @desc    Search users
// @route   GET /users/search
// @access  Private
export const searchUsers = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;
		if (!user) {
			res.status(401).json({ message: "Unauthorized" });
			return;
		}

		const { q } = req.query;

		const query = q
			? {
					fullName: { $regex: q as string, $options: "i" },
			  }
			: {};

		const users = await User.find(query).select("fullName avatarUrl friends");

		const usersWithIsFriend = users.map((userResult) => {
			const isFriend = user.friends.some(
				(friendId) => String(friendId as string) === String(userResult._id),
			);
			return {
				...userResult.toJSON(),
				isFriend: isFriend,
			};
		});

		const sortedAndLimitedUsers = usersWithIsFriend
			.sort((a, b) => Number(b.isFriend) - Number(a.isFriend))
			.slice(0, 10);

		res.status(200).json(sortedAndLimitedUsers);
	}),
];

// @desc    Search users friends by name
// @route   GET /users/search/friends
// @access  Private
export const searchUserFriendsByName = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const pageLength = 12;
		const limit = req.query.limit
			? parseInt(req.query.limit as string)
			: pageLength;
		const page = req.query.page ? parseInt(req.query.page as string) : 0;

		const user = req.user as IUser;
		if (!user) {
			res.status(401).json({ message: "Unauthorized" });
			return;
		}

		const { q } = req.query;

		const query = q
			? {
					fullName: { $regex: q as string, $options: "i" },
					_id: { $in: user.friends },
			  }
			: {
					_id: { $in: user.friends },
			  };

		const users = await User.find(query)
			.select("fullName avatarUrl friends")
			.limit(limit)
			.skip(page * pageLength);

		if (!users) {
			res.status(200).json([]);
			return;
		}

		const usersWithMutualFriends = users?.map((userResult) => {
			const mutualFriends = userResult
				? getMutualFriendIds(userResult, user)
				: [];

			return { ...userResult.toJSON(), mutualFriends };
		});

		res.status(200).json(usersWithMutualFriends);
	}),
];

// @desc    Search users friends by name omitting family members
// @route   GET /users/search/friends-not-family/
// @access  Private
export const searchUserFriendsExcludingFamily = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;
		if (!user) {
			res.status(401).json({ message: "Unauthorized" });
			return;
		}

		const { q } = req.query;
		if (!q) {
			res.status(400).json({ message: "Name is required" });
			return;
		}

		const familyMemberIds = user.familyMembers.map(
			(familyMember) => familyMember.user,
		);

		const users = await User.aggregate([
			{
				$match: {
					$and: [
						{
							fullName: { $regex: q as string, $options: "i" },
						},
						{
							_id: { $in: user.friends },
						},
						{
							_id: { $nin: familyMemberIds },
						},
					],
				},
			},
			{
				$project: {
					fullName: 1,
					avatarUrl: 1,
				},
			},
			{ $limit: 10 },
		]);

		res.status(200).json(users);
	}),
];

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
				select: "fullName",
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
			fullName: `${firstName} ${lastName}`,
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

// @desc    Update user avatar photo
// @route   PATCH /users/:id/avatar-photo
// @access  Private
export const updateUserAvatarUrl = updateUserImage("avatarUrl", {
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

// TODO use key of user?
type UserStandardField =
	| "bio"
	| "hobbies"
	| "intro"
	| "audienceSettings"
	| "relationshipStatus"
	| "phoneNumber"
	| "email"
	| "work"
	| "education"
	| "placesLived"
	| "websites"
	| "socialLinks"
	| "gender"
	| "pronouns"
	| "birthday"
	| "languages"
	| "familyMembers"
	| "aboutYou"
	| "namePronunciation"
	| "favoriteQuotes"
	| "otherNames";

interface PopulateOption {
	path: string;
	select?: string;
	match?: Record<string, unknown>;
	options?: Record<string, unknown>;
}

interface UpdateFuncParams {
	user: IUser;
	body: Request["body"];
	params: Request["params"];
	res: Response;
}

type UpdateFuncType = (
	params: UpdateFuncParams,
) => void | boolean | never[] | Promise<false | undefined | void>;

interface updateUserStandardFieldParams {
	validationRules?: ValidationChain[];
	fieldToUpdate: UserStandardField;
	updateFunc: UpdateFuncType;
	populateOptions?: PopulateOption[];
}

const updateUserStandardField = ({
	fieldToUpdate,
	validationRules = [],
	updateFunc,
	populateOptions = userDefaultPopulation,
}: updateUserStandardFieldParams) => [
	authenticateJwt,
	...validationRules,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const reqUser = req.user as IUser;
		const userId = String(req.params.id);

		if (userId !== reqUser.id && reqUser.userType !== "admin") {
			res.status(403).json({ message: "Unauthorized" });
			return;
		}

		const user = await User.findById(userId).populate(populateOptions);
		if (!user) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		const funcRes = await updateFunc({
			user,
			body: req.body,
			params: req.params,
			res,
		});

		if (funcRes === false) return;

		await user.save();

		res.status(200).json({
			message: `${fieldToUpdate.replace("Url", " ")} updated successfully`,
			user,
		});
	}),
];

// @desc    Update user bio
// @route   PATCH /users/:id/bio
// @access  Private
export const updateUserBio = updateUserStandardField({
	fieldToUpdate: "bio",
	validationRules: bioValidation,
	updateFunc: ({ user, body: { bio } }) => (user.bio = bio),
	populateOptions: userDefaultPopulation,
});

// @desc    Update user hobbies
// @route   PATCH /users/:id/hobbies
// @access  Private
export const updateUserHobbies = updateUserStandardField({
	fieldToUpdate: "hobbies",
	validationRules: hobbiesValidation,
	updateFunc: ({ user, body: { hobbies } }) => (user.hobbies = hobbies),
	populateOptions: userDefaultPopulation,
});

// @desc    Update user intro
// @route   PATCH /users/:id/intro
// @access  Private
export const updateUserIntro = updateUserStandardField({
	fieldToUpdate: "intro",
	validationRules: introValidation,
	updateFunc: ({ user, body }) => {
		log("body", body);
		log("user", user);
		user.intro = { ...user.intro, ...body };
	},
	populateOptions: userDefaultPopulation,
});

// TODO this is gross
// @desc		Update user audience settings
// @route		PATCH /users/:id/audience
// @access	Private
export const updateUserAudienceSettings = updateUserStandardField({
	fieldToUpdate: "audienceSettings",
	validationRules: audienceSettingsValidation,
	updateFunc: ({
		user,
		body: {
			work,
			education,
			placesLived,
			hometown,
			currentCity,
			websites,
			familyMembers,
			otherNames,
			itemId,
			...nonNestedBody
		},
	}) => {
		if (work) {
			user.audienceSettings.work[itemId] = work;
		} else if (education) {
			user.audienceSettings.education[itemId] = education;
		} else if (hometown || currentCity) {
			user.audienceSettings.placesLived[itemId] = hometown || currentCity;
		} else if (placesLived) {
			user.audienceSettings.placesLived[itemId] = placesLived[itemId];
		} else if (websites) {
			user.audienceSettings.websites[itemId] =
				websites[encodeWebsiteId(itemId)];
		} else if (familyMembers) {
			user.audienceSettings.familyMembers[itemId] = familyMembers[itemId];
		} else if (otherNames) {
			user.audienceSettings.otherNames[itemId] = otherNames;
		} else {
			log("nonNestedBody", nonNestedBody);
			user.audienceSettings = { ...user.audienceSettings, ...nonNestedBody };
		}

		user.markModified("audienceSettings");
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Update user phone number
// @route   PATCH /users/:id/phone-number
// @access  Private
export const updateUserPhoneNumber = updateUserStandardField({
	fieldToUpdate: "phoneNumber",
	validationRules: phoneNumberValidation,
	updateFunc: ({
		user,
		body: {
			audience,
			values: { phoneNumber },
		},
	}) => {
		if (audience) user.audienceSettings.phoneNumber = audience;
		user.phoneNumber = phoneNumber;
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Delete user phone number
// @route   DELETE /users/:id/phone-number
// @access	Private
export const deleteUserPhoneNumber = updateUserStandardField({
	fieldToUpdate: "phoneNumber",
	updateFunc: ({ user }) => (user.phoneNumber = undefined),
	populateOptions: userDefaultPopulation,
});

// @desc    Update user email
// @route   PATCH /users/:id/email
// @access  Private
export const updateUserEmail = updateUserStandardField({
	fieldToUpdate: "email",
	validationRules: emailValidation,
	updateFunc: ({
		user,
		body: {
			audience,
			values: { email },
		},
	}) => {
		if (audience) user.audienceSettings.email = audience;

		user.email = email;
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Update user gender
// @route   PATCH /users/:id/gender
// @access  Private
export const updateUserGender = updateUserStandardField({
	fieldToUpdate: "gender",
	validationRules: genderValidation,
	updateFunc: ({ user, body: { audience, values: gender } }) => {
		if (audience) user.audienceSettings.gender = audience;
		user.gender = gender;
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Delete user gender
// @route   DELETE /users/:id/gender
// @access	Private
export const deleteUserGender = updateUserStandardField({
	fieldToUpdate: "gender",
	updateFunc: ({ user }) => (user.gender = undefined),
	populateOptions: userDefaultPopulation,
});

// @desc    Update user pronouns
// @route   PATCH /users/:id/pronouns
// @access  Private
export const updateUserPronouns = updateUserStandardField({
	fieldToUpdate: "pronouns",
	validationRules: pronounsValidation,
	updateFunc: ({ user, body: { audience, values: pronouns } }) => {
		if (audience) user.audienceSettings.pronouns = audience;
		user.pronouns = pronouns;
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Delete user pronouns
// @route   DELETE /users/:id/pronouns
// @access	Private
export const deleteUserPronouns = updateUserStandardField({
	fieldToUpdate: "pronouns",
	updateFunc: ({ user }) => (user.pronouns = undefined),
	populateOptions: userDefaultPopulation,
});

// @desc    Update user languages
// @route   PATCH /users/:id/languages
// @access  Private
export const updateUserLanguages = updateUserStandardField({
	fieldToUpdate: "languages",
	validationRules: languagesValidation,
	updateFunc: ({ user, body: { audience, values: languages } }) => {
		if (audience) user.audienceSettings.languages = audience;
		user.languages = languages;
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Delete user languages
// @route   DELETE /users/:id/languages
// @access	Private
export const deleteUserLanguages = updateUserStandardField({
	fieldToUpdate: "languages",
	updateFunc: ({ user }) => (user.languages = undefined),
	populateOptions: userDefaultPopulation,
});

// @desc    Create user family-members
// @route   POST /users/:id/family-members
// @access  Private
export const createUserFamilyMembers = updateUserStandardField({
	fieldToUpdate: "familyMembers",
	validationRules: familyMemberValidations,
	updateFunc: async ({ user, body: { audience, values: newFamilyMember } }) => {
		user.familyMembers.push(newFamilyMember);

		await user.save();

		const familyMemberId = String(
			user.familyMembers?.[user.familyMembers?.length - 1]._id,
		);

		if (audience) {
			user.audienceSettings.familyMembers[familyMemberId] = audience;
			user.markModified("audienceSettings.familyMembers");
		}
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Update user family-members
// @route   PATCH /users/:id/family-members/:familyMemberId
// @access  Private
export const updateUserFamilyMembers = updateUserStandardField({
	fieldToUpdate: "familyMembers",
	validationRules: familyMemberValidations,
	updateFunc: ({
		user,
		body: { audience, values: newFamilyMemberData },
		params: { familyMemberId },
	}) => {
		if (audience) {
			user.audienceSettings.familyMembers[familyMemberId] = audience;
			user.markModified("audienceSettings.familyMembers");
		}

		user.familyMembers = user.familyMembers?.map((familyMember) =>
			String(familyMember._id) === familyMemberId
				? { ...familyMember, ...newFamilyMemberData }
				: familyMember,
		);
	},

	populateOptions: userDefaultPopulation,
});

// @desc    Delete user family-members
// @route   DELETE /users/:id/family-members/:familyMemberId
// @access	Private
export const deleteUserFamilyMembers = updateUserStandardField({
	fieldToUpdate: "familyMembers",
	updateFunc: ({ user, params: { familyMemberId } }) => {
		user.familyMembers = user.familyMembers?.filter(
			(familyMember) => String(familyMember._id) !== familyMemberId,
		);

		delete user.audienceSettings.familyMembers[familyMemberId];
		user.markModified("audienceSettings.familyMembers");
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Update user relationship status
// @route   PATCH /users/:id/relationship
// @access  Private
export const updateUserRelationshipStatus = updateUserStandardField({
	fieldToUpdate: "relationshipStatus",
	validationRules: relationshipValidations,
	updateFunc: ({ user, body: { audience, values: relationshipStatus } }) => {
		if (audience) user.audienceSettings.relationshipStatus = audience;

		const processedRelationshipStatus =
			processDateValues<IRelationshipStatus>(relationshipStatus);
		user.relationshipStatus = processedRelationshipStatus;
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Update user birthday
// @route   PATCH /users/:id/birthday
// @access  Private
export const updateUserBirthday = updateUserStandardField({
	fieldToUpdate: "birthday",
	validationRules: birthdayValidation,
	updateFunc: ({
		user,
		body: {
			audience,
			values: { day, month, year },
		},
		res,
	}) => {
		if (audience) user.audienceSettings.birthday = audience;

		if (!day || !month || !year) {
			res.status(400).json({
				message: "Invalid date: birthday must include a day, month, and year",
			});
			return false;
		}

		const birthday = new Date(year, month, day);

		validateBirthdayDate(birthday);

		user.birthday = birthday;
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Update user about you
// @route   PATCH /users/:id/about-you
// @access  Private
export const updateUserAboutYou = updateUserStandardField({
	fieldToUpdate: "aboutYou",
	validationRules: aboutYouValidation,
	updateFunc: ({ user, body: { audience, values: aboutYou } }) => {
		if (audience) user.audienceSettings.aboutYou = audience;
		user.aboutYou = aboutYou;
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Delete user about you
// @route   DELETE /users/:id/about-you
// @access	Private
export const deleteUserAboutYou = updateUserStandardField({
	fieldToUpdate: "aboutYou",
	updateFunc: ({ user }) => (user.aboutYou = undefined),
	populateOptions: userDefaultPopulation,
});

// @desc    Update user name pronunciation
// @route   PATCH /users/:id/name-pronunciation
// @access  Private
export const updateUserNamePronunciation = updateUserStandardField({
	fieldToUpdate: "namePronunciation",
	validationRules: namePronunciationValidation,
	updateFunc: ({ user, body: { audience, values: namePronunciation } }) => {
		if (audience) user.audienceSettings.namePronunciation = audience;
		user.namePronunciation = namePronunciation;
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Delete user name pronunciation
// @route   DELETE /users/:id/name-pronunciation
// @access	Private
export const deleteUserNamePronunciation = updateUserStandardField({
	fieldToUpdate: "namePronunciation",
	updateFunc: ({ user }) => (user.namePronunciation = undefined),
	populateOptions: userDefaultPopulation,
});

// @desc    Update user favorite quotes
// @route   PATCH /users/:id/quotes
// @access  Private
export const updateUserFavoriteQuotes = updateUserStandardField({
	fieldToUpdate: "favoriteQuotes",
	validationRules: favoriteQuotesValidation,
	updateFunc: ({ user, body: { audience, values: favoriteQuotes } }) => {
		if (audience) user.audienceSettings.favoriteQuotes = audience;
		user.favoriteQuotes = favoriteQuotes;
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Delete user favorite quotes
// @route   DELETE /users/:id/quotes
// @access	Private
export const deleteUserFavoriteQuotes = updateUserStandardField({
	fieldToUpdate: "favoriteQuotes",
	updateFunc: ({ user }) => (user.favoriteQuotes = undefined),
	populateOptions: userDefaultPopulation,
});

// @desc    Create user other names
// @route   POST /users/:id/other-names
// @access  Private
export const createUserOtherNames = updateUserStandardField({
	fieldToUpdate: "otherNames",
	validationRules: otherNamesValidation,
	updateFunc: async ({
		user,
		body: { audience, values: newOtherName },
		res,
	}) => {
		const otherNameExists = user.otherNames?.some(
			(otherName) => otherName.name === newOtherName.name,
		);

		if (otherNameExists) {
			res.status(400).json({ message: "Other name already exists" });
			return false;
		}

		user.otherNames?.push(newOtherName);

		await user.save();

		const otherNameId = String(
			user.otherNames?.[user.otherNames?.length - 1]._id,
		);

		if (audience) {
			user.audienceSettings.otherNames[otherNameId] = audience;
			user.markModified("audienceSettings.otherNames");
		}
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Update user other names
// @route   PATCH /users/:id/other-names
// @access  Private
export const updateUserOtherNames = updateUserStandardField({
	fieldToUpdate: "otherNames",
	validationRules: otherNamesValidation,
	updateFunc: ({
		user,
		body: { audience, values: newOtherName },
		params: { otherNameId },
	}) => {
		if (audience) user.audienceSettings.otherNames[otherNameId] = audience;

		user.otherNames = user.otherNames?.map((otherName) =>
			String(otherName._id) === otherNameId
				? { ...otherName, ...newOtherName }
				: otherName,
		);
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Delete user other names
// @route   DELETE /users/:id/other-names/:otherNameId
// @access	Private
export const deleteUserOtherNames = updateUserStandardField({
	fieldToUpdate: "otherNames",
	updateFunc: ({ user, params: { otherNameId } }) => {
		user.otherNames = user.otherNames?.filter(
			(otherName) => String(otherName._id) !== otherNameId,
		);

		delete user.audienceSettings.otherNames[otherNameId];
		user.markModified("audienceSettings.otherNames");
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Create user websites
// @route   POST /users/:id/websites
// @access  Private
export const createUserWebsites = updateUserStandardField({
	fieldToUpdate: "websites",
	validationRules: websiteValidation,
	updateFunc: async ({
		user,
		body: {
			audience,
			values: { websites: newWebsite },
		},
		res,
	}) => {
		const websiteExists = user.websites?.some(
			(website) => String(website) === newWebsite,
		);

		if (websiteExists) {
			res.status(400).json({ message: "Website already exists" });
			return false;
		}

		user.websites?.push(newWebsite);

		if (audience) {
			user.audienceSettings.websites[newWebsite] = audience;
			user.markModified("audienceSettings.websites");
		}
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Update user websites
// @route   PATCH /users/:id/websites/:websiteId
// @access  Private
export const updateUserWebsites = updateUserStandardField({
	fieldToUpdate: "websites",
	validationRules: websiteValidation,
	updateFunc: ({
		user,
		body: {
			audience,
			values: { websites: newWebsite },
		},
		params: { websiteId },
	}) => {
		if (audience) {
			user.audienceSettings.websites[websiteId] = audience;
			user.markModified("audienceSettings.websites");
		}

		user.websites = user.websites?.map((website) =>
			String(website) === websiteId ? newWebsite : website,
		);
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Delete user websites
// @route   DELETE /users/:id/websites/:websiteId
// @access  Private
export const deleteUserWebsites = updateUserStandardField({
	fieldToUpdate: "websites",
	updateFunc: ({ user, params: { websiteId } }) => {
		user.websites = user.websites?.filter(
			(website) => String(website) !== websiteId,
		);

		delete user.audienceSettings.websites[websiteId];
		user.markModified("audienceSettings.websites");
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Create user social links
// @route   POST /users/:id/social-links
// @access  Private
export const createUserSocialLinks = updateUserStandardField({
	fieldToUpdate: "socialLinks",
	validationRules: socialLinksValidation,
	updateFunc: async ({ user, body: { audience, values: newSocialLink } }) => {
		user.socialLinks?.push(newSocialLink);

		await user.save();

		const socialLinksId = String(
			user.socialLinks?.[user.socialLinks?.length - 1]._id,
		);

		if (audience) {
			user.audienceSettings.socialLinks[socialLinksId] = audience;
			user.markModified("audienceSettings.socialLinks");
		}
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Update user social links
// @route   PATCH /users/:id/social-links/:socialLinkId
// @access  Private
export const updateUserSocialLinks = updateUserStandardField({
	fieldToUpdate: "socialLinks",
	validationRules: socialLinksValidation,
	updateFunc: ({
		user,
		body: { audience, values: newSocialLink },
		params: { socialLinkId },
	}) => {
		if (audience) {
			user.audienceSettings.socialLinks[socialLinkId] = audience;
			user.markModified("audienceSettings.socialLinks");
		}

		user.socialLinks = user.socialLinks?.map((socialLink) =>
			String(socialLink._id) === socialLinkId ? newSocialLink : socialLink,
		);
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Delete user social links
// @route   DELETE /users/:id/social-links/:socialLinkId
// @access  Private
export const deleteUserSocialLinks = updateUserStandardField({
	fieldToUpdate: "socialLinks",
	updateFunc: ({ user, params: { socialLinkId } }) => {
		user.socialLinks = user.socialLinks?.filter(
			(socialLink) => String(socialLink._id) !== socialLinkId,
		);

		delete user.audienceSettings.socialLinks[socialLinkId];
		user.markModified("audienceSettings.socialLinks");
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Create user work
// @route   POST /users/:id/work
// @access  Private
export const createUserWork = updateUserStandardField({
	fieldToUpdate: "work",
	validationRules: workValidation,
	updateFunc: async ({ user, body: { audience, values } }) => {
		const adjustedWork = adjustEndDateForCurrent<IWork>(values);

		user.work?.push(adjustedWork);

		await user.save();

		const workId = String(user.work?.[user.work?.length - 1]._id);
		if (audience) {
			user.audienceSettings.work[workId] = audience;
			user.markModified("audienceSettings.work");
		}

		// intro
		if (!user.intro.work) user.intro.work = {};
		user.intro.work[workId] = false;
		user.markModified("intro.work");
	},

	populateOptions: userDefaultPopulation,
});

// @desc    Update user work
// @route   PATCH /users/:id/work/:workId
// @access  Private
export const updateUserWork = updateUserStandardField({
	fieldToUpdate: "work",
	validationRules: workValidation,
	updateFunc: ({ user, body: { audience, values }, params: { workId } }) => {
		if (audience) {
			user.audienceSettings.work[workId] = audience;
			user.markModified("audienceSettings.work");
		}

		const adjustedWork = adjustEndDateForCurrent<IWork>(values);

		user.work = user.work?.map((work) =>
			String(work._id) === workId ? { ...work, ...adjustedWork } : work,
		);
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Delete user work
// @route   DELETE /users/:id/work/:workId
// @access  Private
export const deleteUserWork = updateUserStandardField({
	fieldToUpdate: "work",
	updateFunc: ({ user, params: { workId } }) => {
		user.work = user.work?.filter((work) => String(work._id) !== workId);

		delete user.audienceSettings.work[workId];
		user.markModified("audienceSettings.work");
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Create user education
// @route   POST /users/:id/education
// @access  Private
export const createUserEducation = updateUserStandardField({
	fieldToUpdate: "education",
	validationRules: educationValidation,
	updateFunc: async ({ user, body: { audience, values } }) => {
		const processedValues = processEducationValues(values);

		user.education?.push(processedValues);

		await user.save();

		const educationId = String(
			user.education?.[user.education?.length - 1]._id,
		);

		// audience
		if (audience) {
			user.audienceSettings.education[educationId] = audience;
			user.markModified("audienceSettings.education");
		}

		// intro
		if (!user.intro.education) user.intro.education = {};
		user.intro.education[educationId] = false;
		user.markModified("intro.education");
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Update user education
// @route   PATCH /users/:id/education/:educationId
// @access  Private
export const updateUserEducation = updateUserStandardField({
	fieldToUpdate: "education",
	validationRules: educationValidation,
	updateFunc: ({
		user,
		body: { audience, values },
		params: { educationId },
	}) => {
		if (audience) {
			user.audienceSettings.education[educationId] = audience;
			user.markModified("audienceSettings.education");
		}

		const processedValues = processEducationValues(values);

		user.education = user.education?.map((education) =>
			String(education._id) === educationId
				? { ...education, ...processedValues }
				: education,
		);
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Delete user education
// @route   DELETE /users/:id/education/:educationId
// @access  Private
export const deleteUserEducation = updateUserStandardField({
	fieldToUpdate: "education",
	updateFunc: ({ user, params: { educationId } }) => {
		user.education = user.education?.filter(
			(education) => String(education._id) !== educationId,
		);

		delete user.audienceSettings.education[educationId];
		user.markModified("audienceSettings.education");
	},
	populateOptions: userDefaultPopulation,
});

// @desc    Create user places lived
// @route   POST /users/:id/places-lived
// @access  Private
export const createUserPlacesLived = updateUserStandardField({
	fieldToUpdate: "placesLived",
	validationRules: placesLivedValidation,
	updateFunc: async ({ user, body: { audience, values } }) => {
		const processedValues = processDateValues<IPlaceLived>(values);

		user.placesLived?.push(processedValues);

		await user.save();

		const placeLivedId = String(
			user.placesLived?.[user.placesLived?.length - 1]._id,
		);

		if (audience) {
			user.audienceSettings.placesLived[placeLivedId] = audience;
			user.markModified("audienceSettings.placesLived");
		}
	},
	populateOptions: userDefaultPopulation, // maybe not necessary
});

// @desc    Update user places lived
// @route   PATCH /users/:id/places-lived/:placeLivedId
// @access  Private
export const updateUserPlacesLived = updateUserStandardField({
	fieldToUpdate: "placesLived",
	validationRules: placesLivedValidation,
	updateFunc: ({
		user,
		body: { audience, values },
		params: { placeLivedId },
	}) => {
		if (audience) {
			user.audienceSettings.placesLived[placeLivedId] = audience;
			user.markModified("audienceSettings.placesLived");
		}

		const processedValues = processDateValues<IPlaceLived>(values);

		user.placesLived = user.placesLived?.map((place) =>
			String(place._id) === placeLivedId
				? { ...place, ...processedValues }
				: place,
		);
	},
	populateOptions: userDefaultPopulation, // maybe not necessary
});

// @desc    Delete user places lived
// @route   DELETE /users/:id/places-lived/:placeLivedId
// @access  Private
export const deleteUserPlacesLived = updateUserStandardField({
	fieldToUpdate: "placesLived",
	updateFunc: ({ user, params: { placeLivedId } }) => {
		user.placesLived = user.placesLived?.filter(
			(place) => String(place._id) !== placeLivedId,
		);

		delete user.audienceSettings.placesLived[placeLivedId];
		user.markModified("audienceSettings.placesLived");
	},
	populateOptions: userDefaultPopulation, // maybe not necessary
});

type PhotoConditions =
	| [{ author: string }, { taggedUsers?: string }]
	| [{ author: string }];

const getUserPhotos = async (
	req: Request,
	res: Response,
	conditions: PhotoConditions,
) => {
	const posts = await Post.find({
		$or: conditions,
		media: {
			$exists: true,
			$ne: [] || null,
		},
	})
		.select("media")
		.limit(req.query.limit ? parseInt(req.query.limit as string) : 0);

	const photos = posts.reduce((acc, post) => {
		if (post.media && post.media.length > 0) {
			post.media.forEach((mediaItem) => {
				acc.push({ media: mediaItem, postId: post._id });
			});
		}
		return acc;
	}, [] as { media: string; postId: string }[]);

	res.status(200).json(photos);
};

// @desc    Get user tagged + posted photos
// @route   GET /users/:id/photos-of
// @access  Public
export const getUserPhotosOf = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const userId = String(req.params.id);
		await getUserPhotos(req, res, [
			{ author: userId },
			{ taggedUsers: userId },
		]);
	},
);

// @desc    Get user posted photos
// @route   GET /users/:id/photos-by
// @access  Public
export const getUserPhotosBy = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const userId = String(req.params.id);
		await getUserPhotos(req, res, [{ author: userId }]);
	},
);

const getUserFriendsData = (user: IUser, reqUser: IUser) => {
	const userFriends = user?.friends as IUser[];
	const reqUserFriends = reqUser.friends as IUser[];

	const reqUserFriendIdsSet = new Set(
		reqUserFriends.map((friend) => friend._id.toString()),
	);

	const mutualAndReqUserFriends = userFriends?.map((friend) => {
		const friendsFriends = friend.friends as IUser[];
		const friendFriendIdsSet = new Set(
			friendsFriends.map((f) => f._id.toString()),
		);

		const mutualFriends = [...reqUserFriendIdsSet].filter((id) =>
			friendFriendIdsSet.has(id),
		);

		const isFriend = reqUserFriendIdsSet.has(friend._id.toString());

		const requestSent = reqUser.friendRequestsSent.some(
			(id) => String(id) === String(friend.id),
		);
		const requestReceived = reqUser.friendRequestsReceived.some(
			(id) => String(id) === String(friend.id),
		);

		return {
			...friend.toObject(),
			mutualFriends,
			isFriend,
			requestSent,
			requestReceived,
		};
	});

	return mutualAndReqUserFriends;
};

const getReqUserUserFriendsData = (userFriends: IUser[]) => {
	return userFriends?.map((friend) => ({
		...friend.toObject(),
		mutualFriends: userFriends.map((f) => f._id.toString()),
		isFriend: true,
	}));
};

// @desc    Get user friends all
// @route   GET /users/:id/friends
// @access  Public
export const getUserFriends = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const reqUser = req.user as IUser;

		const user = await User.findById(req.params.id)
			.populate("friends", "avatarUrl fullName friends education placesLived")
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

		const mutualAndReqUserFriends = getUserFriendsData(user, reqUser);

		res.status(200).json(mutualAndReqUserFriends);
	}),
];

// @desc    Get user friends suggestions
// @route   GET /users/friends/suggestions
// @access  Public
export const getUserFriendsSuggestions = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const limit = req.query.limit ? parseInt(req.query.limit as string) : 16;
		const page = req.query.page ? parseInt(req.query.page as string) : 0;

		const reqUser = req.user as IUser;
		const userFriendsIds = reqUser.friends as ObjectId[];

		const userFriendAndSentRequestsIds = [
			...userFriendsIds,
			...reqUser.friendRequestsSent,
		];

		const usersWithMutualFriends = await User.find({
			_id: { $nin: userFriendAndSentRequestsIds, $ne: reqUser._id },
			friends: { $in: userFriendsIds },
		})
			.populate("friends", "avatarUrl fullName ")
			.select("friends avatarUrl fullName")
			.limit(limit)
			.skip(page * limit);

		const mutualFriendIds = new Set<string>();
		usersWithMutualFriends.forEach((user) => {
			const userFriends = user.friends as IUser[];
			userFriends.forEach((friend) => {
				if (
					reqUser.friends.some(
						(reqFriend) => String(reqFriend) === String(friend._id),
					)
				) {
					mutualFriendIds.add(String(friend._id));
				}
			});
		});

		const allMutualFriends = await User.find({
			_id: { $in: Array.from(mutualFriendIds) },
		}).select("avatarUrl fullName");

		const usersWithMutualFriendsData = usersWithMutualFriends.map((user) => {
			const userFriends = user.friends as IUser[];
			const mutualFriends = allMutualFriends.filter((mf) =>
				userFriends.some((friend) => String(friend._id) === String(mf._id)),
			);

			return { ...user.toObject(), mutualFriends };
		});

		res.status(200).json(usersWithMutualFriendsData);
	}),
];

// @desc    Get friend requests received
// @route   GET /users/me/friend-requests
// @access  Private
export const getFriendRequestsReceived = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const reqUser = req.user as IUser;

		const pageLength = 12;
		const limit = req.query.limit
			? parseInt(req.query.limit as string)
			: pageLength;
		const page = req.query.page ? parseInt(req.query.page as string) : 0;

		if (reqUser.friendRequestsReceived.length === 0) {
			res.status(200).json([]);
			return;
		}

		const friendRequestsReceived = await User.find({
			_id: { $in: reqUser.friendRequestsReceived },
		})
			.select("avatarUrl fullName friends")
			.limit(limit)
			.skip(page * pageLength);

		const reqUserFriendsPopulated = (await User.findById(reqUser._id)
			.select("friends")
			.populate("friends", "avatarUrl fullName")) as IUser;

		const reqUserFriends = reqUserFriendsPopulated.friends as IUser[];

		const friendRequestsReceivedWithMutualData = friendRequestsReceived.map(
			(user) => {
				const mutualFriendIds = getMutualFriendIds(
					reqUserFriendsPopulated,
					user,
				);
				const mutualFriends = reqUserFriends.filter((friend) =>
					mutualFriendIds.includes(String(friend._id)),
				);

				return {
					...user.toObject(),
					mutualFriends,
				};
			},
		);

		res.status(200).json(friendRequestsReceivedWithMutualData);
	}),
];

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
// @route   POST /users/me/friend-requests/:id
// @access  Private
export const sendFriendRequest = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const reqUser = req.user as IUser;
		const reqUserId = String(reqUser._id);

		const userId = String(req.params.id);
		if (reqUserId === userId) {
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

		await createNotificationForFriendRequest({
			to: userToFollow._id,
			from: reqUser._id,
		});

		res.status(200).json({ message: "Friend request sent successfully" });
	}),
];

// @desc    Cancel friend request
// @route   DELETE /users/me/friend-requests/:id
// @access  Private
export const cancelFriendRequest = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const reqUser = req.user as IUser;
		const reqUserId = String(reqUser._id);

		const userId = String(req.params.id);
		if (reqUserId === userId) {
			res.status(400).json({ message: "Invalid request" });
			return;
		}

		const userToUnrequest = (await User.findById(userId)) as IUser;
		if (!userToUnrequest || userToUnrequest.isDeleted) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		// Check if a friend request was sent
		const userHasSentRequest =
			userToUnrequest.friendRequestsReceived.includes(reqUser._id) &&
			reqUser.friendRequestsSent.some(
				(id) => String(id) === String(userToUnrequest.id),
			);
		if (!userHasSentRequest) {
			res.status(400).json({ message: "No friend request to cancel" });
			return;
		}

		// Remove the friend request
		userToUnrequest.friendRequestsReceived =
			userToUnrequest.friendRequestsReceived.filter(
				(id) => String(id) !== String(reqUser._id),
			);
		await userToUnrequest.save();

		await User.findByIdAndUpdate(reqUser._id, {
			$pull: { friendRequestsSent: userToUnrequest._id },
		});

		await removeNotificationForFriendRequest({
			to: userToUnrequest._id,
			from: reqUser._id,
		});

		res.status(200).json({ message: "Friend request cancelled successfully" });
	}),
];

// @desc    Remove friend
// @route   DELETE /users/me/friends/:friendId
// @access  Private
export const unfriendUser = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const reqUser = req.user as IUser;
		const reqUserId = String(reqUser._id);

		const userToUnfriendId = String(req.params.friendId);

		if (reqUserId === userToUnfriendId) {
			res.status(400).json({ message: "Cannot remove self as friend" });
			return;
		}

		// get user to unfriend
		const userToRemove = (await User.findById(userToUnfriendId).populate(
			"friends",
			"avatarUrl fullName friends",
		)) as IUser;

		if (!userToRemove || userToRemove.isDeleted) {
			res.status(404).json({ message: "User not found" });
			return;
		}

		// get user to unfriend's friends and remove reqUser
		const userToRemoveFriends = userToRemove.friends as IUser[];

		userToRemove.friends = userToRemoveFriends.filter(
			(friend) => String(friend._id) !== reqUserId,
		);
		await userToRemove.save();

		// remove user to unfriend from reqUser's friends
		const updatedUser = (await User.findByIdAndUpdate(
			reqUserId,
			{
				$pull: { friends: userToRemove._id },
			},
			{ new: true },
		).populate("friends", "avatarUrl fullName friends")) as IUser;

		const user = getReqUserUserFriendsData(updatedUser.friends as IUser[]);

		res.status(200).json({
			message: "Friend removed successfully",
			user,
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
			userToAccept.friends.some(
				(friend) => String(friend) === String(reqUser._id),
			) ||
			reqUser.friends.some(
				(friend) => String(friend) === String(userToAccept._id),
			);
		if (userAlreadyFriended) {
			res.status(400).json({ message: "Already friends with user" });
			return;
		}

		const userToAcceptRequest = userToAccept.friendRequestsSent.some(
			(request) => String(request) === reqUser.id,
		);

		const reqUserRequest = reqUser.friendRequestsReceived.some(
			(request) => String(request) === requestId,
		);

		if (!userToAcceptRequest || !reqUserRequest) {
			res.status(404).json({ message: "Friend request not found" });
			return;
		}

		await User.findByIdAndUpdate(reqUser._id, {
			$pull: { friendRequestsReceived: requestId },
			$addToSet: { friends: userToAccept._id },
		});

		await User.findByIdAndUpdate(userToAccept._id, {
			$pull: { friendRequestsSent: reqUser._id },
			$addToSet: { friends: reqUser._id },
		});

		await createNotificationForAcceptedFriendRequest({
			userAccepting: reqUser._id,
			userRequesting: userToAccept._id,
		});

		res.status(200).json({
			message: "Friend request accepted successfully",
		});
	}),
];

// @desc    Reject friend request
// @route   DELETE /users/me/friend-requests/:requestId/reject
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
			userToReject.friends.some(
				(friend) => String(friend) === String(reqUser._id),
			) ||
			reqUser.friends.some(
				(friend) => String(friend) === String(userToReject._id),
			);
		if (userAlreadyFriended) {
			res.status(400).json({ message: "Already friends with user" });
			return;
		}

		const userToRejectRequest = userToReject.friendRequestsSent.some(
			(request) => String(request) === String(reqUser.id),
		);

		const reqUserRequest = reqUser.friendRequestsReceived.some(
			(request) => String(request) === requestId,
		);

		if (!userToRejectRequest || !reqUserRequest) {
			res.status(404).json({ message: "Friend request not found" });
			return;
		}

		await User.findByIdAndUpdate(reqUser._id, {
			$pull: { friendRequestsReceived: requestId },
		});

		await User.findByIdAndUpdate(userToReject._id, {
			$pull: { friendRequestsSent: reqUser._id },
		});

		await removeNotificationForFriendRequest({
			to: requestId,
			from: reqUser._id,
		});

		res.status(200).json({
			message: "Friend request rejected successfully",
		});
	}),
];
