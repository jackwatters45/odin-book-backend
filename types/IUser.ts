import { ObjectId, Document } from "mongoose";

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
	country?: string;
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
	code?: string;
	token?: string;
	tokenExpires?: number;
}

export interface UserResetPasswordData {
	type: "email" | "phoneNumber";
	code?: string;
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

export interface WorkData {
	company: string;
	position?: string;
	city?: string;
	description?: string;
	startDate?: Date;
	endDate?: Date | null;
}

export interface EducationData {
	school: string;
	degree?: string;
	fieldOfStudy?: string;
	city?: string;
	description?: string;
	startDate?: Date;
	endDate?: Date | null;
	concentration?: string;
	secondaryConcentrations?: string[];
	activities?: string[];
}

export interface PlaceLivedData {
	city: string;
	country: string;
	dateMovedIn?: Date;
	dateMovedOut?: Date | null;
}

export interface SocialLinksData {
	platform: string;
	username: string;
	url: string;
}

export interface LifeEventData {
	title: string;
	description?: string;
	date: Date;
}

// User About Data
export interface UserAboutData {
	work?: WorkData[];
	education?: EducationData[];
	placesLived?: PlaceLivedData[];
	website?: string;
	socialLinks?: SocialLinksData[];
	aboutYou?: string;
	nicknames?: string[];
	lifeEvents?: LifeEventData[];
}

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

export interface IUserWithId extends IUser {
	_id: ObjectId;
}
