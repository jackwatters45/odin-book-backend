import { ObjectId, Document } from "mongoose";
import {
	AudienceStatusOptionsType,
	ValidSocialPlatformsType,
	attendedForType,
	educationTypesType,
	placesLivedType,
} from "../src/constants";
import { Gender } from "../src/constants/Gender";
import { PronounsType } from "../src/constants/Pronouns";
import { FamilyMember } from "../src/constants/FamilyMembers";
import { IRelationshipStatus } from "../src/constants/VALID_RELATIONSHIP_STATUSES_ARRAY";
import { OtherNames } from "../src/constants/OtherNames";

// Basic User Info
export interface BasicUserInfo {
	firstName: string;
	lastName: string;
	fullName: string;
	email: string;
	gender?: Gender;
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

export type IncludesStartDates = {
	startYear: string | undefined;
	startMonth: string | undefined;
	startDay: string | undefined;
};

export type IncludesEndDates = {
	endYear: string | undefined;
	endMonth: string | undefined;
	endDay: string | undefined;
};

export type IncludesStartEndDates = IncludesStartDates & IncludesEndDates;

export interface WorkData extends IncludesStartEndDates {
	_id: ObjectId;
	current: boolean;
	company: string;
	position?: string;
	city?: string;
	description?: string;
}

export interface EducationData extends IncludesStartEndDates {
	_id: ObjectId;
	type: educationTypesType;
	school: string;
	graduated: boolean;
	degree?: string;
	attendedFor?: attendedForType;
	concentrations?: string[];
	description?: string;
}

export interface PlaceLivedData extends IncludesStartDates {
	_id: ObjectId;
	type: placesLivedType;
	city: string;
	state: string;
	country: string;
}

export interface SocialLinksData {
	_id: ObjectId;
	platform: ValidSocialPlatformsType;
	username: string;
}

export interface LifeEventData {
	_id: ObjectId;
	title: string;
	date: Date;
}

export interface NamePronunciationData {
	firstName: string | undefined;
	lastName: string | undefined;
}

export const INTRO_FIELDS = [
	"pronouns",
	"work",
	"education",
	"currentCity",
	"hometown",
	"relationshipStatus",
	"namePronunciation",
	"joined",
	"websites",
	"socialLinks",
] as const;

export type IntroFieldsType = (typeof INTRO_FIELDS)[number];

export type IntroField = Record<string, boolean>;

export interface IntroData {
	pronouns?: IntroField;
	work?: IntroField;
	education?: IntroField;
	currentCity?: IntroField;
	hometown?: IntroField;
	relationshipStatus?: IntroField;
	namePronunciation?: IntroField;
	joined: IntroField;
	websites?: IntroField;
	socialLinks?: IntroField;
}

export const AUDIENCE_FIELDS = [
	"work",
	"education",
	"currentCity",
	"hometown",
	"relationshipStatus",
	"phoneNumber",
] as const;

export type AudienceFieldsType = (typeof AUDIENCE_FIELDS)[number];

type AudienceStatusMultiple = { [key: string]: AudienceStatusOptionsType };

export interface AudienceSettings {
	currentCity: AudienceStatusOptionsType;
	hometown: AudienceStatusOptionsType;
	relationshipStatus: AudienceStatusOptionsType;
	phoneNumber: AudienceStatusOptionsType;
	email: AudienceStatusOptionsType;
	gender: AudienceStatusOptionsType;
	pronouns: AudienceStatusOptionsType;
	birthday: AudienceStatusOptionsType;
	languages: AudienceStatusOptionsType;
	aboutYou: AudienceStatusOptionsType;
	namePronunciation: AudienceStatusOptionsType;
	favoriteQuotes: AudienceStatusOptionsType;

	// multiple
	familyMembers: AudienceStatusMultiple;
	socialLinks: AudienceStatusMultiple;
	websites: AudienceStatusMultiple;
	work: AudienceStatusMultiple;
	education: AudienceStatusMultiple;
	placesLived: AudienceStatusMultiple;
	otherNames: AudienceStatusMultiple;
}

// User About Data
export interface UserAboutData {
	work: WorkData[];
	education: EducationData[];
	placesLived: PlaceLivedData[];
	websites: string[];
	socialLinks: SocialLinksData[];
	nicknames: string[];

	// edit profile
	hobbies: string[];
	bio: string;
	namePronunciation?: NamePronunciationData;

	intro: IntroData;

	taggedPosts: ObjectId[];
	relationshipStatus: IRelationshipStatus;

	familyMembers: FamilyMember[];

	aboutYou?: string;

	favoriteQuotes?: string;

	audienceSettings: AudienceSettings;

	otherNames: OtherNames;
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
