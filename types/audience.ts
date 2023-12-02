export const AUDIENCE_STATUS_OPTIONS = [
	"Public",
	"Friends",
	"Only Me",
] as const;

export const AUDIENCE_SETTINGS_FIELDS = [
	"currentCity",
	"hometown",
	"relationshipStatus",
	"phoneNumber",
	"email",
	"gender",
	"pronouns",
	"birthday",
	"languages",
	"aboutYou",
	"namePronunciation",
	"favoriteQuotes",
	"familyMembers",
	"socialLinks",
	"websites",
	"work",
	"education",
	"placesLived",
	"otherNames",
] as const;

export type AudienceStatusOptionsType =
	(typeof AUDIENCE_STATUS_OPTIONS)[number];

export type AudienceStatusMultiple = {
	[key: string]: AudienceStatusOptionsType;
};

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

export type AudienceSettingsKeys = keyof AudienceSettings;
