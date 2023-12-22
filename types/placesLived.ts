import { ObjectId } from "mongoose";
import { IncludesStartDates } from "./includesStartEndDates";

export const PLACES_LIVED_TYPE = ["current", "hometown", "default"] as const;

export type PlacesLivedType = (typeof PLACES_LIVED_TYPE)[number];

export interface IPlaceLived extends IncludesStartDates {
	_id: ObjectId;
	type: PlacesLivedType;
	city: string;
	state: string;
	country: string;
}
