import { Schema } from "mongoose";

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

export const UserAboutDataSchema = new Schema<UserAboutData>({
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
			platform: { type: String, required: true, trim: true, lowercase: true },
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
	aboutYou: { type: String, trim: true, maxlength: 1000 },
	nicknames: [{ type: String, trim: true, maxlength: 50 }],
	lifeEvents: [
		{
			title: { type: String, required: true, trim: true, maxlength: 200 },
			description: { type: String, trim: true, maxlength: 500 },
			date: { type: Date, required: true },
		},
	],
});

UserAboutDataSchema.path("work").default([]);
UserAboutDataSchema.path("education").default([]);
UserAboutDataSchema.path("placesLived").default([]);
UserAboutDataSchema.path("socialLinks").default([]);
UserAboutDataSchema.path("nicknames").default([]);
UserAboutDataSchema.path("lifeEvents").default([]);
