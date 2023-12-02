import { ObjectId } from "mongodb";
import { IncludesStartEndDates } from "./includesStartEndDates";

export interface IWork extends IncludesStartEndDates {
	_id: ObjectId;
	current: boolean;
	company: string;
	position?: string;
	city?: string;
	description?: string;
}
