import { AudienceStatusOptionsType } from "./audience";

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

export interface IIntro {
	pronouns?: IntroField;
	work?: IntroField;
	education?: IntroField;
	currentCity?: IntroField;
	hometown?: IntroField;
	relationshipStatus?: IntroField;
	namePronunciation?: IntroField;
	joined: IntroField;
	websites?: Record<string, AudienceStatusOptionsType>;
	socialLinks?: Record<string, AudienceStatusOptionsType>;
}
