import debug from "debug";

import Reaction, { reactionTypes } from "../../../../src/models/reaction.model";
import {
	getRandValueFromArray,
	getRandValuesFromArrayOfObjs,
	getRandomInt,
} from "../../utils/helperFunctions";
import { IComment } from "../../../../src/models/comment.model";
import { IPost } from "../../../../src/models/post.model";
import { IUser } from "../../../../src/models/user.model";
import { createNotificationWithMultipleFrom } from "../../../../src/controllers/notifications/utils/createNotificationWithMultipleFrom";
import getDateForInteraction from "./getDateForInteraction";

const log = debug("log:addReactions");

const addReactions = async (
	parent: IComment | IPost,
	users: IUser[],
	maxReactions: number,
	contentType: "comment" | "post",
) => {
	const numReactions = getRandomInt(maxReactions);

	let usersReacting: string[] = [];
	usersReacting = getRandValuesFromArrayOfObjs(users, numReactions) as string[];

	const reactions = usersReacting.map(
		(user) =>
			new Reaction({
				parent: parent._id,
				user,
				type: getRandValueFromArray(reactionTypes),
			}),
	);

	if (reactions) await Reaction.insertMany(reactions);

	const date = getDateForInteraction(parent.createdAt);

	try {
		if (reactions.length > 0) {
			await createNotificationWithMultipleFrom({
				query: {
					to: parent.author,
					type: "reaction",
					contentType,
					contentId: parent._id,
					postId: contentType === "post" ? parent._id : undefined,
				},
				from: usersReacting,
				date,
				includeSocket: false,
			});

			return reactions.map((r) => r._id);
		}
	} catch (err) {
		throw new Error(err);
	}
};

export default addReactions;
