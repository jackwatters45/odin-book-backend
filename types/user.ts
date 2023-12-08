import { ObjectId } from "mongoose";
import { IGender } from "./gender";
import { PronounsType } from "./pronouns";
import { IFamilyMember } from "./familyMembers";
import { IRelationshipStatus } from "./relationshipStatus";
import { OtherNames } from "./otherNames";
import { IEducation } from "./education";
import { IPlaceLived } from "./placesLived";
import { ISocialLinks } from "./socialLinks";
import { AudienceSettings } from "./audience";
import { IIntro } from "./intro";
import { IWork } from "./work";
import { INamePronunciationData } from "./namePronunciation";
import { IUser } from "../src/models/user.model";

// Basic User Info
export interface BasicUserInfo {
	firstName: string;
	lastName: string;
	fullName: string;
	email: string;
	gender?: IGender;
	birthday: Date;
	languages?: string[];
	pronouns?: PronounsType;
	avatarUrl?: string;
	coverPhotoUrl?: string;
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

export interface UserActivityData {
	friends: (ObjectId | Partial<IUser>)[];
	savedPosts: ObjectId[];
	friendRequestsSent: ObjectId[];
	friendRequestsReceived: ObjectId[];
}

interface DeletedData {
	deletedBy: ObjectId | null;
	deletedAt: Date;
	email: string;
	followerCount: number;
}

export interface UserSystemData {
	createdAt?: Date;
	updatedAt?: Date;
	userType: "user" | "admin" | "guest";
	isDeleted: boolean;
	deletedData?: DeletedData;
	validUntil?: number;
	refreshTokens: string[];
	expiresAt?: Date;
}

export interface UserAboutData {
	work: IWork[];
	education: IEducation[];
	placesLived: IPlaceLived[];
	websites: string[];
	socialLinks: ISocialLinks[];
	hobbies: string[];
	bio: string;
	namePronunciation?: INamePronunciationData;
	intro: IIntro;
	taggedPosts: ObjectId[];
	relationshipStatus: IRelationshipStatus;
	familyMembers: IFamilyMember[];
	aboutYou?: string;
	favoriteQuotes?: string;
	audienceSettings: AudienceSettings;
	otherNames: OtherNames;
}
