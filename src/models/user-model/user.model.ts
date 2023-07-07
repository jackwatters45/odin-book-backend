import { Schema, model, ObjectId, Document } from "mongoose";
import bcrypt from "bcryptjs";
import { UserAboutData, UserAboutDataSchema } from "./user-about.model";

// Basic User Info
export interface BasicUserInfo {
	firstName: string;
	lastName: string;
	fullName: string;
	email: string;
	pronouns?: string;
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
}

const UserSchema = new Schema<IUser>(
	{
		firstName: { type: String, required: true, trim: true, maxlength: 25 },
		lastName: { type: String, required: true, trim: true, maxlength: 25 },
		email: { type: String, trim: true, unique: true, sparse: true },
		phoneNumber: {
			type: String,
			trim: true,
			unique: true,
			sparse: true,
		},
		password: { type: String, trim: true, minlength: 8 },
		facebookId: { type: String, trim: true, unique: true, sparse: true },
		googleId: { type: String, trim: true, unique: true, sparse: true },
		githubId: { type: String, trim: true, unique: true, sparse: true },
		pronouns: { type: String, trim: true, default: "" },
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

// TODO Indexes

export default model<IUser>("User", UserSchema);
