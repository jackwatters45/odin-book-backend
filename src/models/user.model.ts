import { Schema, model, Document } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import {
	BasicUserInfo,
	UserLoginData,
	UserActivityData,
	UserSystemData,
	UserAboutData,
	UserVerificationData,
	UserResetPasswordData,
} from "../../types/user";
import {
	VALID_ATTENDED_FOR,
	VALID_EDUCATION_TYPES,
} from "../../types/education";
import { DEFAULT_GENDER_TYPES } from "../../types/gender";
import { PRONOUNS } from "../../types/pronouns";
import { FAMILY_RELATIONSHIPS } from "../../types/familyMembers";
import { OTHER_NAME_TYPES } from "../../types/otherNames";
import { AUDIENCE_STATUS_OPTIONS } from "../../types/audience";
import { VALID_RELATIONSHIP_STATUSES_ARRAY } from "../../types/relationshipStatus";
import { PLACES_LIVED_TYPE } from "../../types/placesLived";
import { VALID_SOCIAL_PLATFORMS_ARRAY } from "../../types/socialLinks";
import { jwtSecret } from "../config/envVariables";

export interface IUser
	extends Document,
		BasicUserInfo,
		UserLoginData,
		UserActivityData,
		UserSystemData,
		UserAboutData {
	verification: UserVerificationData;
	resetPassword: UserResetPasswordData;
	comparePassword: (password: string) => Promise<boolean>;
	generateJwtToken: () => string;
}

const workSchema = new Schema({
	company: { type: String, required: true, trim: true, maxlength: 100 },
	position: { type: String, trim: true, maxlength: 100 },
	city: { type: String, trim: true, maxlength: 100 },
	description: { type: String, trim: true, maxlength: 500 },
	current: { type: Boolean, default: false },
	startYear: { type: String, default: undefined },
	startMonth: { type: String, default: undefined },
	startDay: { type: String, default: undefined },
	endYear: { type: String, default: undefined },
	endMonth: { type: String, default: undefined },
	endDay: { type: String, default: undefined },
});

const educationSchema = new Schema({
	type: { type: String, enum: VALID_EDUCATION_TYPES },
	school: { type: String, required: true, trim: true, maxlength: 100 },
	degree: { type: String, trim: true, maxlength: 50 },
	attendedFor: {
		type: String,
		trim: true,
		maxlength: 50,
		enum: VALID_ATTENDED_FOR,
	},
	concentrations: [{ type: String, trim: true, maxlength: 50 }],
	description: { type: String, trim: true, maxlength: 500 },
	graduated: { type: Boolean, default: false },
	startYear: { type: String, default: undefined },
	startMonth: { type: String, default: undefined },
	startDay: { type: String, default: undefined },
	endYear: { type: String, default: undefined },
	endMonth: { type: String, default: undefined },
	endDay: { type: String, default: undefined },
});

const placesLivedSchema = new Schema({
	type: {
		type: String,
		enum: PLACES_LIVED_TYPE,
		default: "other",
	},
	city: { type: String, required: true, trim: true, maxlength: 100 },
	state: { type: String, required: true, trim: true, maxlength: 100 },
	country: { type: String, required: true, trim: true, maxlength: 100 },
	startYear: { type: String, default: undefined },
	startMonth: { type: String, default: undefined },
	startDay: { type: String, default: undefined },
});

const socialLinksSchema = new Schema({
	platform: {
		type: String,
		required: true,
		trim: true,
		lowercase: true,
		enum: VALID_SOCIAL_PLATFORMS_ARRAY,
	},
	username: {
		type: String,
		required: true,
		trim: true,
		maxlength: 40,
	},
});

const familyMemberSchema = new Schema({
	user: { type: Schema.Types.ObjectId, ref: "User" },
	relationship: {
		type: String,
		trim: true,
		required: true,
		enum: FAMILY_RELATIONSHIPS,
	},
});

const relationshipStatusSchema = new Schema({
	user: { type: Schema.Types.ObjectId, ref: "User" },
	status: {
		type: String,
		trim: true,
		enum: VALID_RELATIONSHIP_STATUSES_ARRAY,
	},
	startYear: { type: String, default: undefined },
	startMonth: { type: String, default: undefined },
	startDay: { type: String, default: undefined },
});

const otherNameSchema = new Schema({
	name: { type: String, trim: true, maxlength: 50 },
	type: { type: String, trim: true, enum: OTHER_NAME_TYPES },
	showAtTop: { type: Boolean, default: false },
});

const defaultAudienceSetting = {
	type: String,
	enum: AUDIENCE_STATUS_OPTIONS,
	default: "Friends",
};

const defaultAudienceSettingMultiple = {
	type: Object,
	of: defaultAudienceSetting,
	default: {},
};

const UserSchema = new Schema<IUser>(
	{
		firstName: { type: String, required: true, trim: true, maxlength: 50 },
		lastName: { type: String, required: true, trim: true, maxlength: 50 },
		fullName: { type: String, required: true, trim: true, maxlength: 100 },
		email: {
			type: String,
			trim: true,
			unique: true,
			sparse: true,
			lowercase: true,
			minlength: 5,
			maxlength: 253,
		},
		phoneNumber: {
			type: String,
			trim: true,
			unique: true,
			sparse: true,
			minlength: 10,
			maxlength: 15,
		},
		birthday: { type: Date },
		password: {
			type: String,
			trim: true,
			minlength: 8,
			maxlength: 100,
			select: false,
		},
		country: { type: String, trim: true, maxlength: 100 },
		facebookId: {
			type: String,
			trim: true,
			unique: true,
			sparse: true,
			select: false,
		},
		googleId: {
			type: String,
			trim: true,
			unique: true,
			sparse: true,
			select: false,
		},
		githubId: {
			type: String,
			trim: true,
			unique: true,
			sparse: true,
			select: false,
		},
		gender: {
			defaultType: {
				type: String,
				trim: true,
				enum: DEFAULT_GENDER_TYPES,
			},
			other: { type: String, trim: true, maxlength: 50 },
		},
		pronouns: {
			type: String,
			trim: true,
			enum: PRONOUNS,
		},
		aboutYou: { type: String, trim: true, maxlength: 1000 },
		familyMembers: [familyMemberSchema],
		friends: [{ type: Schema.Types.ObjectId, ref: "User" }],
		description: { type: String, trim: true, default: "" },
		coverPhotoUrl: { type: String, trim: true, default: "" },
		avatarUrl: { type: String, trim: true, default: "" },
		savedPosts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
		friendRequestsSent: [{ type: Schema.Types.ObjectId, ref: "User" }],
		friendRequestsReceived: [{ type: Schema.Types.ObjectId, ref: "User" }],
		userType: {
			type: String,
			required: true,
			trim: true,
			default: "user" as const,
			enum: ["user", "admin", "guest"],
		},
		isDeleted: { type: Boolean, default: false },
		deletedData: {
			deletedBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
			deletedAt: { type: Date, required: false },
			email: { type: String, trim: true, required: false },
			followerCount: { type: Number, required: false },
		},
		validUntil: { type: Number, required: false },
		refreshTokens: [{ type: String, trim: true, select: false }],
		verification: {
			isVerified: { type: Boolean, default: false },
			type: {
				type: String,
				trim: true,
				enum: ["email", "phoneNumber"],
				default: "email",
				select: false,
			},
			code: { type: String, trim: true, select: false },
			token: { type: String, trim: true, select: false },
			tokenExpires: { type: Number, select: false },
		},
		resetPassword: {
			type: {
				type: String,
				trim: true,
				enum: ["email", "phoneNumber"],
				default: "email",
				select: false,
			},
			code: { type: String, trim: true, select: false },
			token: { type: String, trim: true, select: false },
			tokenExpires: { type: Number, select: false },
		},
		work: [workSchema],
		education: [educationSchema],
		placesLived: [placesLivedSchema],
		websites: [{ type: String, trim: true, maxlength: 200 }],
		socialLinks: [socialLinksSchema],
		languages: [{ type: String, trim: true, maxlength: 50 }],
		bio: { type: String, trim: true, maxlength: 101 },
		hobbies: [{ type: String, trim: true }],
		namePronunciation: {
			firstName: { type: String, trim: true, maxlength: 50 },
			lastName: { type: String, trim: true, maxlength: 50 },
		},
		favoriteQuotes: { type: String, trim: true, maxlength: 500 },
		otherNames: [otherNameSchema],
		intro: {
			pronouns: { type: Map, of: Boolean, default: { pronouns: false } },
			work: { type: Map, of: Boolean, default: {} },
			education: { type: Map, of: Boolean, default: {} },
			currentCity: { type: Map, of: Boolean, default: { currentCity: false } },
			hometown: { type: Map, of: Boolean, default: { hometown: false } },
			relationshipStatus: {
				type: Map,
				of: Boolean,
				default: { relationshipStatus: false },
			},
			namePronunciation: {
				type: Map,
				of: Boolean,
				default: { namePronunciation: false },
			},
			joined: { type: Map, of: Boolean, default: { joined: false } },
			websites: {
				type: Map,
				of: String,
				default: {
					websites: "Only Me",
				},
			},
			socialLinks: {
				type: Map,
				of: {
					type: String,
					enum: AUDIENCE_STATUS_OPTIONS,
				},
				default: {
					socialLinks: "Only Me",
				},
			},
		},
		audienceSettings: {
			hometown: defaultAudienceSetting,
			relationshipStatus: defaultAudienceSetting,
			phoneNumber: defaultAudienceSetting,
			email: defaultAudienceSetting,
			gender: defaultAudienceSetting,
			pronouns: defaultAudienceSetting,
			birthday: defaultAudienceSetting,
			languages: defaultAudienceSetting,
			aboutYou: defaultAudienceSetting,
			namePronunciation: defaultAudienceSetting,
			favoriteQuotes: defaultAudienceSetting,

			// multiple
			familyMembers: defaultAudienceSettingMultiple,
			websites: defaultAudienceSettingMultiple,
			work: defaultAudienceSettingMultiple,
			education: defaultAudienceSettingMultiple,
			placesLived: defaultAudienceSettingMultiple,
			socialLinks: defaultAudienceSettingMultiple,
			otherNames: defaultAudienceSettingMultiple,
		},
		relationshipStatus: relationshipStatusSchema,
		taggedPosts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
		expiresAt: { type: Date, expires: "0" },
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	},
);

UserSchema.path("friends").default([]);
UserSchema.path("savedPosts").default([]);
UserSchema.path("friendRequestsSent").default([]);
UserSchema.path("friendRequestsReceived").default([]);
UserSchema.path("refreshTokens").default([]);

UserSchema.path("work").default([]);
UserSchema.path("education").default([]);
UserSchema.path("placesLived").default([]);
UserSchema.path("socialLinks").default([]);

UserSchema.pre("save", function (this: IUser, next) {
	if (
		(this.isModified("firstName") || this.isModified("lastName")) &&
		typeof this.firstName === "string" &&
		typeof this.lastName === "string"
	) {
		this.fullName = `${this.firstName} ${this.lastName}`;
	}
	next();
});

UserSchema.virtual("isVerified").get(function (this: IUser) {
	return this.verification.isVerified;
});

UserSchema.virtual("friendCount").get(function (this: IUser) {
	return this.friends?.length;
});

UserSchema.pre("save", async function (this: IUser, next) {
	const SALT_LENGTH = 10;
	if ((this.isModified("password") || this.isNew) && this.password) {
		this.password = await bcrypt.hash(this.password, SALT_LENGTH);
	}
	next();
});

UserSchema.methods.comparePassword = async function (password: string) {
	return await bcrypt.compare(password, this.password);
};

UserSchema.methods.generateJwtToken = function () {
	return jwt.sign({ _id: this._id }, jwtSecret, { expiresIn: "1h" });
};

export default model<IUser>("User", UserSchema);
