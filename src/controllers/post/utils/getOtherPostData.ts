import Post, { IPost } from "../../../models/post.model";
import getDocumentWithTopReactions from "../../../utils/getDocumentWithTopReactions";

const getOtherPostData = async (post: IPost) => {
	const postWithTopReactions = getDocumentWithTopReactions(post);

	const shareCount = await Post.countDocuments({
		sharedFrom: post._id,
	});

	return {
		...postWithTopReactions,
		shareCount,
	};
};

export default getOtherPostData;
