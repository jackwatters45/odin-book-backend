import { Schema, model } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { IUser } from "../../types/IUser";

import { jwtSecret } from "../config/envVariables";
import {
	AUDIENCE_STATUS_OPTIONS,
	VALID_SOCIAL_PLATFORMS_ARRAY,
} from "../constants";

const UserSchema = new Schema<IUser>(
	{
		firstName: { type: String, required: true, trim: true, maxlength: 50 },
		lastName: { type: String, required: true, trim: true, maxlength: 50 },
		email: {
			type: String,
			trim: true,
			unique: true,
			sparse: true,
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
		gender: { type: String, trim: true },
		pronouns: {
			type: String,
			trim: true,
			enum: ["he/him", "she/her", "they/them"],
		},
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
			default: "user",
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
		work: [
			{
				company: { type: String, required: true, trim: true, maxlength: 100 },
				position: { type: String, trim: true, maxlength: 100 },
				city: { type: String, trim: true, maxlength: 100 },
				description: { type: String, trim: true, maxlength: 500 },
				startDate: { type: Date },
				endDate: { type: Date },
			},
		],
		education: [
			{
				school: { type: String, required: true, trim: true, maxlength: 100 },
				degree: { type: String, trim: true, maxlength: 100 },
				fieldOfStudy: { type: String, trim: true, maxlength: 100 },
				concentration: { type: String, trim: true, maxlength: 100 },
				secondaryConcentrations: [{ type: String, trim: true, maxlength: 100 }],
				city: { type: String, trim: true, maxlength: 100 },
				description: { type: String, trim: true, maxlength: 500 },
				startDate: { type: Date },
				endDate: { type: Date },
				activities: [{ type: String, trim: true, maxlength: 500 }],
			},
		],
		placesLived: [
			{
				city: { type: String, required: true, trim: true, maxlength: 100 },
				country: { type: String, required: true, trim: true, maxlength: 100 },
				dateMovedIn: { type: Date },
				dateMovedOut: { type: Date },
			},
		],
		website: { type: String, trim: true, maxlength: 200 },
		socialLinks: [
			{
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
					minlength: 3,
					maxlength: 40,
				},
				url: { type: String, trim: true, maxlength: 200 },
			},
		],
		bio: { type: String, trim: true, maxlength: 101 },
		hobbies: [{ type: String, trim: true }],
		nicknames: [{ type: String, trim: true, maxlength: 50 }],
		namePronunciation: {
			firstName: { type: String, required: true, trim: true, maxlength: 50 },
			lastName: { type: String, required: true, trim: true, maxlength: 50 },
			fullName: { type: String, required: true, trim: true, maxlength: 100 },
		},
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
		taggedPosts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
		lifeEvents: [
			{
				title: { type: String, required: true, trim: true, maxlength: 200 },
				description: { type: String, trim: true, maxlength: 500 },
				date: { type: Date, required: true },
			},
		],
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
UserSchema.path("nicknames").default([]);
UserSchema.path("lifeEvents").default([]);

UserSchema.virtual("fullName").get(function (this: IUser) {
	if (!this.firstName || !this.lastName) return "";
	return `${this.firstName} ${this.lastName}`;
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

// TODO Indexes

export default model<IUser>("User", UserSchema);
