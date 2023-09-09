export const AUDIENCE_STATUS_OPTIONS = [
	"Public",
	"Friends",
	"Only Me",
] as const;

export type AudienceStatusOptionsType =
	(typeof AUDIENCE_STATUS_OPTIONS)[number];
