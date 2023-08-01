import { Request } from "express";
import { IUser } from "../src/models/user-model/user.model";

// Passport Request Interface Extension
interface IRequestWithUser extends Request {
	user?: IUser;
}

export default IRequestWithUser;
