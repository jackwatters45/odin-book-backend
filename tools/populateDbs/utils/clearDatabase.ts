import User from "../../../src/models/user-model/user.model";
import Post from "../../../src/models/post.model";
import Comment from "../../../src/models/comment.model";
import Reaction from "../../../src/models/reaction.model";

const clearDatabase = async () => {
	await User.deleteMany({});
	await Post.deleteMany({});
	await Comment.deleteMany({});
	await Reaction.deleteMany({});
};

export default clearDatabase;
