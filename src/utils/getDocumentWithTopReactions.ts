import debug from "debug";
import { ObjectId, Document } from "mongoose";

import { IReaction, ReactionType } from "../models/post.model";

const log = debug("log:getDocumentWithTopReactions");
export interface DocumentWithReactions extends Document {
	reactions: (ObjectId | IReaction)[];
}

interface DocumentWithTopReactions {
	popularReactions: ReactionType[];
}

function getDocumentWithTopReactions(
	document: DocumentWithReactions,
): DocumentWithTopReactions {
	const reactionCounts: Record<string, number> = {};

	const populateReactions = document.reactions as unknown as
		| IReaction[]
		| undefined;

	populateReactions?.forEach((reaction) => {
		if (!reaction.type) return;
		reactionCounts[reaction.type] = (reactionCounts[reaction.type] || 0) + 1;
	});

	const popularReactions = Object.entries(reactionCounts)
		.sort(([, countA], [, countB]) => countB - countA)
		.slice(0, 3)
		.filter(([type]) => !!type)
		.map(([type]) => type) as ReactionType[];

	return {
		...document.toObject(),
		popularReactions,
	};
}

export default getDocumentWithTopReactions;
