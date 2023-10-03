import { IncludesStartDates } from "../../types/IUser";
import { IUserSearchBase } from "./IUserSearchBase";

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
	extends IUserSearchBase,
		IncludesStartDates {
	status: ValidRelationshipStatusesType;
}
