import { ObjectId } from "mongoose";

export interface IUserSearchBase {
	_id: ObjectId;
	user: ObjectId;
}
