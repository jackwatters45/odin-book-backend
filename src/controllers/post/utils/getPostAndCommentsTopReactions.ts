import { IPost } from "../../../models/post.model";
import getDocumentWithTopReactions from "../../../utils/getDocumentWithTopReactions";
import getOtherPostData from "./getOtherPostData";
import { IComment } from "../../../models/comment.model";

const getPostAndCommentsTopReactions = async (post: IPost) => {
	const otherPostData = await getOtherPostData(post);

	const postCommentsPopulated = post.comments as IComment[];
	const commentsWithTopReactions = postCommentsPopulated.map((comment) => {
		return getDocumentWithTopReactions(comment);
	});

	return { ...otherPostData, comments: commentsWithTopReactions };
};

export default getPostAndCommentsTopReactions;
