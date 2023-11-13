import { IPost } from "../../models/post.model";
import getDocumentWithTopReactions, {
	DocumentWithReactions,
} from "./getDocumentWithTopReactions";

const getPostAndCommentsTopReactions = (post: IPost) => {
	const postWithTopReactions = getDocumentWithTopReactions(post);

	const commentsWithTopReactions = post.comments.map((comment) => {
		return getDocumentWithTopReactions(
			comment as unknown as DocumentWithReactions,
		);
	});

	return { ...postWithTopReactions, comments: commentsWithTopReactions };
};

export default getPostAndCommentsTopReactions;
