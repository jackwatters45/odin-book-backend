import debug from "debug";

import Post from "../../../src/models/post.model";
import Comment from "../../../src/models/comment.model";
import Reaction from "../../../src/models/reaction.model";
import Notification from "../../../src/models/notification.model";
import User from "../../../src/models/user.model";

const log = debug("log:clearDatabase");

export const myUserIds = [
	"65261430a93bbe7662c9056f",
	"6529cae2fca18c43f66a3679",
	"6529cb0efca18c43f66a3682",
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
