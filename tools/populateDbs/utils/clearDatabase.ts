import debug from "debug";

import Post from "../../../src/models/post.model";
import Comment from "../../../src/models/comment.model";
import Reaction from "../../../src/models/reaction.model";
import Notification from "../../../src/models/notification.model";
import User from "../../../src/models/user.model";

const log = debug("log:clearDatabase");

export const myUserIds = [
	"6591f32f2e76436d6db87261",
	"6591f3a62e76436d6db8732c",
] as const;

const clearDatabase = async () => {
	log("Cleaning database...");

	await User.deleteMany({ _id: { $not: { $in: myUserIds } } });
	await Post.deleteMany({ author: { $not: { $in: myUserIds } } });

	await Comment.deleteMany({});
	await Reaction.deleteMany({});
	await Notification.deleteMany({});

	log("Finished cleaning database");
};

export default clearDatabase;
