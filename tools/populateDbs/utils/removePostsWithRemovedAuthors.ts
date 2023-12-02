import debug from "debug";
import Post from "../../../src/models/post.model";
import User from "../../../src/models/user.model";
import { configDb, disconnectFromDatabase } from "../../../src/config/database";
import { ObjectId } from "mongoose";

const log = debug("log:removePostsWithRemovedAuthors");

export const removePostsWithRemovedAuthors = async (includeConfig = false) => {
	log("Removing posts with removed authors...");

	if (includeConfig) await configDb();

	const users = await User.find({}).select("_id").lean();
	const posts = await Post.find({}).select("author").lean();

	const postsWithRemovedAuthors: ObjectId[] = [];
	for (const post of posts) {
		const postAuthor = users.some((u) => String(u._id) === String(post.author));
		if (!postAuthor) postsWithRemovedAuthors.push(post._id);
	}

	await Post.deleteMany({ _id: { $in: postsWithRemovedAuthors } });

	log("Finished removing posts with removed authors");

	if (includeConfig) await disconnectFromDatabase();
};

// removePostsWithRemovedAuthors().catch(console.error);
