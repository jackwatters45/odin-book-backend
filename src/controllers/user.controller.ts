import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { ValidationChain, body, validationResult } from "express-validator";
import debug from "debug";

import User from "../models/user.model";
import {
	IUser,
	LifeEventData,
	PlaceLivedData,
	WorkData,
} from "../../types/IUser";
import Post from "../models/post.model";
import Comment from "../models/comment.model";
import validateAndFormatUsername from "./utils/validateAndFormatUsername";
import { authenticateJwt } from "../middleware/authenticateJwt";
import { uploadFileToCloudinary } from "../utils/uploadToCloudinary";
import { resizeImage } from "../utils/resizeImages";
import upload from "../config/multer";
import removeFromCloudinary from "../utils/removeFromCloudinary";
import adjustEndDateForCurrent from "./utils/adjustEndDateForCurrent";
import processDateValues from "./utils/processDateValues";
import processEducationValues from "./utils/processEducationValues";
import encodeWebsiteId from "./utils/encodeWebsiteId";
import { IRelationshipStatus } from "../constants/VALID_RELATIONSHIP_STATUSES_ARRAY";
import audienceSettingsValidation from "./validations/audienceSettingsValidation";
import bioValidation from "./validations/bioValidation";
import hobbiesValidation from "./validations/hobbiesValidation";
import introValidation from "./validations/introValidation";
import phoneNumberValidation from "./validations/phoneNumberValidation";
import emailValidation from "./validations/emailValidation";
import genderValidation from "./validations/genderValidation";
import pronounsValidation from "./validations/pronounsValidation";
import languagesValidation from "./validations/languagesValidation";
import familyMemberValidations from "./validations/familyMemberValidations";
import relationshipValidation from "./validations/relationshipValidations";
import websiteValidation from "./validations/websiteValidation";
import socialLinksValidation from "./validations/socialLinksValidation";
import placesLivedValidation from "./validations/placesLivedValidation";
import birthdayValidation from "./validations/birthdayValidation";
import educationValidation from "./validations/educationValidation";
import workValidation from "./validations/workValidation";
import aboutYouValidation from "./validations/aboutYouValidation";
import namePronunciationValidation from "./validations/namePronunciationValidation";
import favoriteQuotesValidation from "./validations/favoriteQuotesValidation";
import otherNamesValidation from "./validations/otherNamesValidation";

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

		const userWithCommentsPosts = { ...user?.toJSON(), posts, comments };
		res.status(200).json(userWithCommentsPosts);
	},
);

// @desc    Search users friends by name
// @route   GET /users/search/friends
// @access  Private
export const searchUserFriendsByName = [
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

		const users = await User.find({
			fullName: { $regex: q as string, $options: "i" },
			_id: { $in: user.friends },
		}).select("fullName avatarUrl");

		res.status(200).json({ users });
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
		]);

		res.status(200).json({ users });
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

		let user = await User.findById(userId);
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

		user = await User.findById(userId).populate(populateOptions).exec();

		res
			.status(200)
			.json({ message: `${fieldToUpdate} updated successfully`, user });
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
	validationRules: relationshipValidation,
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
			log("audience", audience);
			log("otherNameId", otherNameId);
			log("user.audienceSettings.otherNames", user.audienceSettings.otherNames);
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
		const adjustedWork = adjustEndDateForCurrent<WorkData>(values);

		user.work?.push(adjustedWork);

		await user.save();

		const workId = String(user.work?.[user.work?.length - 1]._id);
		if (audience) {
			user.audienceSettings.work[workId] = audience;
			user.markModified("audienceSettings.work");
		}
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

		const adjustedWork = adjustEndDateForCurrent<WorkData>(values);

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

		if (audience) {
			user.audienceSettings.education[educationId] = audience;
			user.markModified("audienceSettings.education");
		}
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
		const processedValues = processDateValues<PlaceLivedData>(values);

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

		const processedValues = processDateValues<PlaceLivedData>(values);

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

// @desc Get user life events
// @route GET /users/:id/life-events
// @access Public
export const getUserLifeEvents = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const userId = String(req.params.id);
		const lifeEvents = await Post.find({
			author: userId,
			lifeEvent: { $exists: true, $ne: null },
		})
			.select("lifeEvent")
			.populate("lifeEvent")
			.sort({ "lifeEvent.date": -1 })
			.limit(req.query.limit ? parseInt(req.query.limit as string) : 0);

		const formattedLifeEvents = lifeEvents.map((post) => {
			const lifeEvent = post.lifeEvent as LifeEventData;
			return {
				_id: lifeEvent?._id,
				postId: post._id,
				title: lifeEvent?.title,
				date: lifeEvent?.date,
			};
		});

		res.status(200).json(formattedLifeEvents);
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
