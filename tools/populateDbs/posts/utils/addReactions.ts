import Reaction, { reactionTypes } from "../../../../src/models/reaction.model";
import {
	getRandValueFromArray,
	getRandValuesFromArrayOfObjs,
	getRandomInt,
} from "../../utils/helperFunctions";
import { createNotificationWithMultipleFrom } from "../../../../src/controllers/notifications/notification.controller";
import { IComment } from "../../../../src/models/comment.model";
import { IPost } from "../../../../src/models/post.model";
import { getNotificationBetweenDates } from "../../utils/getNotificationBetweenDates";
import { IUser } from "../../../../src/models/user.model";

const addReactions = async (
	parent: IComment | IPost,
	users: IUser[],
	maxReactions: number,
	contentType: "comment" | "post",
) => {
	const numReactions = getRandomInt(maxReactions);

	const usersReacting = getRandValuesFromArrayOfObjs(
		users,
		numReactions,
	) as string[];

	const reactions = usersReacting.map(
		(user) =>
			new Reaction({
				parent: parent._id,
				user,
				type: getRandValueFromArray(reactionTypes),
			}),
	);

	try {
		await Reaction.insertMany(reactions);

		await createNotificationWithMultipleFrom({
			query: {
				to: parent.author,
				type: "reaction",
				contentType,
				contentId: parent._id,
				postId: contentType === "post" ? parent._id : undefined,
			},
			from: usersReacting,
			date: getNotificationBetweenDates(),
			includeSocket: false,
		});

		return reactions.map((r) => r._id);
	} catch (err) {
		throw new Error(err);
	}
};

export default addReactions;
