import { Request } from "express";
import { IUser } from "./IUser";

// Passport Request Interface Extension
interface IRequestWithUser extends Request {
	user?: IUser;
}

export default IRequestWithUser;
