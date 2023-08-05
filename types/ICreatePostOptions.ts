import { ObjectId } from "mongoose";

interface ICreatePostOptions {
	author?: ObjectId;
	includeComments?: boolean;
	includeReactions?: boolean;
	allPublished?: boolean;
}

export default ICreatePostOptions;
