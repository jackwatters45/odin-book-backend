import { IncludesStartDates } from "./includesStartEndDates";
import { IUserSearchBase } from "./search";

export const VALID_RELATIONSHIP_STATUSES_ARRAY = [
	"single",
	"in a relationship",
	"engaged",
	"married",
	"in a civil union",
	"in a domestic partnership",
	"in an open relationship",
	"it's complicated",
	"separated",
	"divorced",
	"widowed",
] as const;

export type ValidRelationshipStatusesType =
	(typeof VALID_RELATIONSHIP_STATUSES_ARRAY)[number];

export interface IRelationshipStatus
	extends Partial<IUserSearchBase>,
		IncludesStartDates {
	status: ValidRelationshipStatusesType;
}
