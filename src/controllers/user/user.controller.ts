import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { ValidationChain, validationResult } from "express-validator";
import { ObjectId, isValidObjectId } from "mongoose";
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
	findMutualFriends,
	userDefaultPopulation,
	getUserStatus,
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
import { IWork } from "../../../types/work";
import { IPlaceLived } from "../../../types/placesLived";
import {
	createNotificationForAcceptedFriendRequest,
	createNotificationForFriendRequest,
	removeNotificationForFriendRequest,
} from "../notifications/utils/notificationForFriendRequests";
import createUserValidation from "./validations/createUserValidation";
import updateUserPasswordValidation from "./validations/updateUserPasswordValidation";
import {
	IUserWithMutualFriends,
	UserPreview,
	UserPreviewWithFriendLists,
} from "../../../types/user";

const log = debug("log:user:controller");

// @desc    Get all users
// @route   GET /users
// @access  Private
export const getUsers = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const usersTotal = await User.countDocuments({ isDeleted: false });
		const users = await User.find({ isDeleted: false })
			.sort({ createdAt: -1 })
			.limit(req.query.limit ? parseInt(req.query.limit as string) : 0)
			.skip(req.query.offset ? parseInt(req.query.offset as string) : 0)
			.populate(userDefaultPopulation)
			.lean();

		res.status(200).json({ users, meta: { total: usersTotal } });
	},
);

// @desc    Get user by id
// @route   GET /users/:id
// @access  Private
export const getUserById = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const reqUser = req.user as IUser;

		if (!isValidObjectId(req.params.id)) {
			res.status(400).json({ message: "User not found" });
			return;
		}

		const user = await User.findById(req.params.id)
			.populate(userDefaultPopulation)
			.lean();

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

		const mutualFriends = await findMutualFriends(
			reqUser?._id,
			user._id,
			false,
		);

		const status = getUserStatus(user, reqUser, reqUser.friends as ObjectId[]);

		res.status(200).json({ ...user, mutualFriends, status });
	}),
];

// @desc    Search users
// @route   GET /users/search
// @access  Private
export const searchUsers = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		const query = req.query.q
			? { fullName: { $regex: req.query.q as string, $options: "i" } }
			: {};

		const friendsQuery = { ...query, _id: { $in: user.friends } };
		const friendsResults = await User.find(friendsQuery)
			.select("fullName avatarUrl friends")
			.limit(10)
			.lean();

		const friendUsers = friendsResults.map((userResult) => ({
			...userResult,
			isFriend: true,
		}));

		if (friendsResults.length >= 10) {
			res.status(200).json(friendUsers);
			return;
		}

		const nonFriendsQuery = { ...query, _id: { $nin: user.friends } };
		const nonFriendsResults = await User.find(nonFriendsQuery)
			.select("fullName avatarUrl friends")
			.limit(10 - friendsResults.length)
			.lean();

		const nonFriendsUsers = nonFriendsResults.map((userResult) => ({
			...userResult,
			isFriend: false,
		}));

		res.status(200).json([...friendUsers, ...nonFriendsUsers]);
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

		const reqUser = req.user as IUser;

		const { q, exclude } = req.query;
		const excludeIds = exclude ? (exclude as string).split(",") : [];

		const query = q
			? {
					fullName: { $regex: q as string, $options: "i" },
					_id: { $in: reqUser.friends, $nin: excludeIds },
			  }
			: {
					_id: { $in: reqUser.friends, $nin: excludeIds },
			  };

		const users = await User.find(query)
			.limit(limit)
			.skip(page * limit)
			.select("fullName avatarUrl friends")
			.populate("friends", "fullName avatarUrl")
			.lean();

		if (!users) {
			res.status(200).json([]);
			return;
		}

		const usersWithMutualFriends = await Promise.all(
			users?.map(async (userResult) => {
				const mutualFriends = await findMutualFriends(
					reqUser?._id,
					userResult._id,
				);

				return { ...userResult, mutualFriends, status: "friend" };
			}),
		);

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
						{ fullName: { $regex: q as string, $options: "i" } },
						{ _id: { $in: user.friends } },
						{ _id: { $nin: familyMemberIds } },
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

		const [user, posts, comments] = await Promise.all([
			User.findById(req.params.id)
				.populate({
					path: "deletedData.deletedBy",
					select: "fullName",
				})
				.lean(),
			Post.find({ published: true, author: req.params.id }).lean(),
			Comment.find({ author: req.params.id }).lean(),
		]);

		res.status(200).json({ user, posts, comments });
	}),
];

// @desc    Create user
// @route   POST /users
// @access  Admin
export const createUser = [
	authenticateJwt,
	...createUserValidation,
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
	...updateUserPasswordValidation,
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

		await User.findByIdAndUpdate(req.params.id, {
			password: req.body.newPassword,
		});

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

		const resizedImage = await resizeImage(file, imageDimensions);
		const imageLink = await uploadFileToCloudinary(resizedImage);

		const user = await User.findByIdAndUpdate(userId, {
			[fieldToUpdate]: imageLink,
		});

		const prevImageUrl = user?.[fieldToUpdate];

		if (prevImageUrl) await removeFromCloudinary(prevImageUrl);

		res.status(201).json(imageLink);
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
	fieldToUpdate: keyof IUser;
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

		const user = await User.findById(userId);
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

		const userPopulated = await User.findById(userId)
			.populate(populateOptions)
			.lean();

		res.status(200).json({
			message: `${fieldToUpdate.replace("Url", " ")} updated successfully`,
			user: userPopulated,
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
		user.intro = { ...user.intro, ...body };
	},
	populateOptions: userDefaultPopulation,
});

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
		} else if (otherNames) {
			user.audienceSettings.otherNames[itemId] = otherNames;
		} else if (placesLived) {
			user.audienceSettings.placesLived[itemId] = placesLived[itemId];
		} else if (familyMembers) {
			user.audienceSettings.familyMembers[itemId] = familyMembers[itemId];
		} else if (websites) {
			user.audienceSettings.websites[itemId] =
				websites[encodeWebsiteId(itemId)];
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
	updateFunc: async ({ user, body: { audience, ...newFamilyMember } }) => {
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
		body: { audience, ...newFamilyMemberData },
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
	updateFunc: ({ user, body: { audience, ...relationshipStatus } }) => {
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
	const limit = req.query.limit ? parseInt(req.query.limit as string) : 12;
	const page = req.query.page ? parseInt(req.query.page as string) : 0;

	const posts = await Post.find({
		$or: conditions,
		$and: [
			{ media: { $exists: true } },
			{ media: { $ne: null } },
			{ media: { $ne: [] } },
		],
	})
		.select("media")
		.lean();

	const allMediaItems = posts.reduce((acc, post) => {
		return post.media
			? acc.concat(
					post.media.map((mediaItem) => ({
						media: mediaItem,
						postId: post._id,
					})),
			  )
			: acc;
	}, [] as { media: string; postId: string }[]);

	const startIndex = page * limit;
	const paginatedMedia = allMediaItems.slice(startIndex, startIndex + limit);

	res.status(200).json(paginatedMedia);
};

// @desc    Get user tagged + posted photos
// @route   GET /users/:id/photos-of
// @access  Private
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
// @access  Private
export const getUserPhotosBy = expressAsyncHandler(
	async (req: Request, res: Response) => {
		await getUserPhotos(req, res, [{ author: String(req.params.id) }]);
	},
);

type fetchFriendsFunc = (
	user: IUser,
	limit: number,
	page: number,
	reqUser: UserPreviewWithFriendLists,
) => Promise<IUser[]>;

const userFriendsHandler = (fetchFriendsFunc: fetchFriendsFunc) => [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const reqUser = req.user as UserPreviewWithFriendLists;
		const limit = req.query.limit ? parseInt(req.query.limit as string) : 0;
		const page = req.query.page ? parseInt(req.query.page as string) : 0;

		const user = await User.findOne({ _id: req.params.id, isDeleted: false })
			.select("friends")
			.lean();

		if (!user) {
			res.status(404).json({ message: "User not found or has been deleted" });
			return;
		}

		const friends = await fetchFriendsFunc(user, limit, page, reqUser);

		const reqUserFriends = reqUser.friends as ObjectId[];
		const mutualAndReqUserFriends: IUserWithMutualFriends[] = await Promise.all(
			friends?.map(async (friend) => {
				const mutualFriends = (await findMutualFriends(
					friend._id,
					reqUser._id,
				)) as UserPreview[];

				const status = getUserStatus(friend, reqUser, reqUserFriends);

				return {
					...friend,
					mutualFriends,
					status,
				};
			}),
		);

		res.status(200).json(mutualAndReqUserFriends);
	}),
];

// @desc    Get user friends all
// @route   GET /users/:id/friends
// @access  Private
export const getUserFriends = userFriendsHandler(
	async (user, limit, page) =>
		await User.find({ _id: { $in: user.friends } })
			.skip(page * limit)
			.limit(limit)
			.select("avatarUrl fullName friends")
			.lean(),
);

// @desc    Get user friends mutual
// @route   GET /users/:id/friends/mutual
// @access  Private
export const getUserFriendsMutual = userFriendsHandler(
	async (user, limit, page, reqUser) =>
		await User.find({
			$and: [{ _id: { $in: user.friends } }, { _id: { $in: reqUser.friends } }],
		})
			.skip(page * limit)
			.limit(limit)
			.select("avatarUrl fullName friends")
			.lean(),
);

// @desc    Get user friends college
// @route   GET /users/:id/friends/college
// @access  Private
export const getUserFriendsCollege = userFriendsHandler(
	async (user, limit, page) => {
		const userColleges = user.education
			?.filter((education) => education.type === "college")
			.map((education) => education.school);

		log("userColleges", userColleges);

		return await User.find({
			_id: { $in: user.friends },
			education: {
				$elemMatch: { type: "college", school: { $in: userColleges } },
			},
		})
			.skip(page * limit)
			.limit(limit)
			.select("avatarUrl fullName friends education")
			.lean();
	},
);

// @desc    Get user friends current city
// @route   GET /users/:id/friends/current-city
// @access  Private
export const getUserFriendsCurrentCity = userFriendsHandler(
	async (user, limit, page) => {
		const userCurrentCity = user.placesLived?.find(
			(placeLived) => placeLived.type === "current",
		)?.city;

		return await User.find({
			_id: { $in: user.friends },
			placesLived: { $elemMatch: { type: "current", city: userCurrentCity } },
		})
			.skip(page * limit)
			.limit(limit)
			.select("avatarUrl fullName friends placesLived")
			.lean();
	},
);

// @desc    Get user friends hometown
// @route   GET /users/:id/friends/hometown
// @access  Private
export const getUserFriendsHometown = userFriendsHandler(
	async (user, limit, page) => {
		const userHometown = user.placesLived?.find(
			(placeLived) => placeLived.type === "hometown",
		)?.city;

		return await User.find({
			_id: { $in: user.friends },
			placesLived: { $elemMatch: { type: "hometown", city: userHometown } },
		})
			.skip(page * limit)
			.limit(limit)
			.select("avatarUrl fullName friends placesLived")
			.lean();
	},
);

// @desc    Get user friends suggestions
// @route   GET /users/friends/suggestions
// @access  Private
export const getUserFriendsSuggestions = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const limit = req.query.limit ? parseInt(req.query.limit as string) : 16;
		const page = req.query.page ? parseInt(req.query.page as string) : 0;

		const reqUser = req.user as UserPreviewWithFriendLists;
		const reqUserFriends = reqUser.friends as ObjectId[];

		const usersWithMutualFriends = (await User.find({
			_id: { $nin: reqUserFriends, $ne: reqUser._id },
			friends: { $in: reqUserFriends },
		})
			.populate("friends", "avatarUrl fullName ")
			.select(
				"avatarUrl fullName friends friendRequestsSent friendRequestsReceived",
			)
			.limit(limit)
			.skip(page * limit)
			.lean()) as UserPreviewWithFriendLists[];

		const usersWithMutualFriendsData: IUserWithMutualFriends[] =
			await Promise.all(
				usersWithMutualFriends.map(async (user) => {
					const mutualFriends = (await findMutualFriends(
						user._id,
						reqUser._id,
					)) as UserPreviewWithFriendLists[];

					const status = getUserStatus(user, reqUser, reqUserFriends);

					return {
						...user,
						mutualFriends,
						status,
					};
				}),
			);

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

		const friendRequestsReceived = (await User.find({
			_id: { $in: reqUser.friendRequestsReceived },
		})
			.select("avatarUrl fullName friends")
			.limit(limit)
			.skip(page * pageLength)
			.lean()) as UserPreview[];

		const friendRequestsReceivedWithMutualData: IUserWithMutualFriends[] =
			await Promise.all(
				friendRequestsReceived.map(async (user) => {
					const mutualFriends = (await findMutualFriends(
						user._id,
						reqUser._id,
					)) as UserPreview[];
					return { ...user, mutualFriends, status: "request received" };
				}),
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
			.lean();

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

		const userToFollow = await User.findOne({
			_id: userId,
			isDeleted: { $ne: true },
			friends: { $ne: reqUserId },
			friendRequestsReceived: { $ne: reqUserId },
		});

		if (!userToFollow) {
			res
				.status(404)
				.json({ message: "User not found or already friends/requested" });
			return;
		}

		await Promise.all([
			User.findByIdAndUpdate(userToFollow._id, {
				$addToSet: { friendRequestsReceived: reqUserId },
			}),
			User.findByIdAndUpdate(reqUserId, {
				$addToSet: { friendRequestsSent: userToFollow._id },
			}),
			createNotificationForFriendRequest({
				to: userToFollow._id,
				from: reqUserId,
			}),
		]);

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

		const userToUnrequest = await User.findOne({
			_id: userId,
			friendRequestsReceived: reqUser._id,
			isDeleted: { $ne: true },
		});

		if (!userToUnrequest) {
			res
				.status(404)
				.json({ message: "User not found or no friend request to cancel" });
			return;
		}

		await Promise.all([
			User.findByIdAndUpdate(userToUnrequest._id, {
				$pull: { friendRequestsReceived: reqUserId },
			}),
			User.findByIdAndUpdate(reqUserId, {
				$pull: { friendRequestsSent: userToUnrequest._id },
			}),
			removeNotificationForFriendRequest({
				to: userToUnrequest._id,
				from: reqUserId,
			}),
		]);

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

		const userToRemove = await User.findOne({
			_id: userToUnfriendId,
			isDeleted: { $ne: true },
			friends: reqUserId,
		});

		if (!userToRemove) {
			res.status(404).json({ message: "User not found or not a friend" });
			return;
		}

		await Promise.all([
			User.findByIdAndUpdate(reqUserId, {
				$pull: { friends: userToUnfriendId },
			}),
			User.findByIdAndUpdate(userToUnfriendId, {
				$pull: { friends: reqUserId },
			}),
		]);

		res.status(200).json({
			message: "Friend removed successfully",
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

		const userToAccept = await User.findOne({
			_id: requestId,
			friendRequestsSent: reqUser._id,
			isDeleted: { $ne: true },
		});

		if (!userToAccept) {
			res
				.status(404)
				.json({ message: "Friend request not found or user not found" });
			return;
		}

		const userAlreadyFriended = await User.findOne({
			_id: { $in: [reqUser._id, requestId] },
			friends: { $in: [reqUser._id, requestId] },
		});

		if (userAlreadyFriended) {
			res.status(400).json({ message: "Already friends with user" });
			return;
		}

		await Promise.all([
			User.findByIdAndUpdate(reqUser._id, {
				$pull: { friendRequestsReceived: requestId },
				$addToSet: { friends: userToAccept._id },
			}),
			User.findByIdAndUpdate(userToAccept._id, {
				$pull: { friendRequestsSent: reqUser._id },
				$addToSet: { friends: reqUser._id },
			}),
			createNotificationForAcceptedFriendRequest({
				userAccepting: reqUser._id,
				userRequesting: userToAccept._id,
			}),
		]);

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

		const userToReject = await User.findOne({
			_id: requestId,
			friendRequestsSent: reqUser._id,
			isDeleted: { $ne: true },
		});

		if (!userToReject) {
			res
				.status(404)
				.json({ message: "Friend request not found or user not found" });
			return;
		}

		await Promise.all([
			User.findByIdAndUpdate(reqUser._id, {
				$pull: { friendRequestsReceived: requestId },
			}),
			User.findByIdAndUpdate(userToReject._id, {
				$pull: { friendRequestsSent: reqUser._id },
			}),
			removeNotificationForFriendRequest({
				to: requestId,
				from: reqUser._id,
			}),
		]);

		res.status(200).json({
			message: "Friend request rejected successfully",
		});
	}),
];
