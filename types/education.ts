import { ObjectId } from "mongodb";
import { IncludesStartEndDates } from "./includesStartEndDates";

export const VALID_EDUCATION_TYPES = ["college", "high school"] as const;

export type educationTypesType = (typeof VALID_EDUCATION_TYPES)[number];

export const VALID_ATTENDED_FOR = ["undergraduate", "graduate school"] as const;

export type attendedForType = (typeof VALID_ATTENDED_FOR)[number];

export interface IEducation extends IncludesStartEndDates {
	_id: ObjectId;
	type: educationTypesType;
	school: string;
	graduated: boolean;
	degree?: string;
	attendedFor?: attendedForType;
	concentrations?: string[];
	description?: string;
}
