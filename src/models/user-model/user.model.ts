import { Schema, model, ObjectId, Document } from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { UserAboutData, UserAboutDataSchema } from "./user-about.model";
import { jwtSecret } from "../../config/envVariables";

// Basic User Info
export interface BasicUserInfo {
	firstName: string;
	lastName: string;
	fullName: string;
	email: string;
	gender?: string;
	birthday: Date;
	pronouns?: "he/him" | "she/her" | "they/them";
	avatarUrl?: string;
	description?: string;
	phoneNumber?: string;
}

export interface UserLoginData {
	password?: string;
	facebookId?: string;
	googleId?: string;
	githubId?: string;
}

export interface UserVerificationData {
	isVerified: boolean;
	type: "email" | "phoneNumber";
	token?: string;
	tokenExpires?: number;
}

export interface UserResetPasswordData {
	type: "email" | "phoneNumber";
	token?: string;
	tokenExpires?: number;
}

// User Activity Data
export interface UserActivityData {
	friends: ObjectId[];
	savedPosts: ObjectId[];
	friendRequestsSent: ObjectId[];
	friendRequestsReceived: ObjectId[];
}

// User Deleted Data
interface DeletedData {
	deletedBy: ObjectId | null;
	deletedAt: Date;
	email: string;
	followerCount: number;
}

// User System Data
export interface UserSystemData {
	createdAt?: Date;
	updatedAt?: Date;
	userType: "user" | "admin" | "guest";
	isDeleted: boolean;
	deletedData?: DeletedData;
	validUntil?: number;
	refreshTokens: string[];
}

export interface IUser
	extends Document,
		BasicUserInfo,
		UserLoginData,
		UserActivityData,
		UserSystemData,
		UserAboutData {
	// UserAboutData is from user-about.model.ts
	verification: UserVerificationData;
	resetPassword: UserResetPasswordData;
	comparePassword: (password: string) => Promise<boolean>;
	generateJwtToken: () => string;
}

export interface IUserWithId extends IUser {
	_id: ObjectId;
}

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
			maxlength: 50,
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
		password: { type: String, trim: true, minlength: 8, maxlength: 100 },
		facebookId: { type: String, trim: true, unique: true, sparse: true },
		googleId: { type: String, trim: true, unique: true, sparse: true },
		githubId: { type: String, trim: true, unique: true, sparse: true },
		gender: { type: String, trim: true },
		pronouns: {
			type: String,
			trim: true,
			enum: ["he/him", "she/her", "they/them"],
		},
		friends: [{ type: Schema.Types.ObjectId, ref: "User" }],
		description: { type: String, trim: true, default: "" },
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
		refreshTokens: [{ type: String, trim: true }],
		verification: {
			isVerified: { type: Boolean, default: false },
			type: {
				type: String,
				trim: true,
				enum: ["email", "phoneNumber"],
				default: "email",
			},
			token: { type: String, trim: true },
			tokenExpires: { type: Number },
		},
		resetPassword: {
			type: {
				type: String,
				trim: true,
				enum: ["email", "phoneNumber"],
				default: "email",
			},
			token: { type: String, trim: true },
			tokenExpires: { type: Number },
		},
		...UserAboutDataSchema.obj,
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

UserSchema.virtual("fullName").get(function (this: IUser) {
	if (!this.firstName || !this.lastName) return "";
	return `${this.firstName} ${this.lastName}`;
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
