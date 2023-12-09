import debug from "debug";
import { ObjectId, Document } from "mongoose";
import { IReaction, ReactionType } from "../models/reaction.model";

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
	const populateReactions = document.reactions as IReaction[] | undefined;

	const reactionCounts =
		populateReactions?.reduce<Record<string, number>>((acc, reaction) => {
			if (reaction.type) {
				acc[reaction.type] = (acc[reaction.type] || 0) + 1;
			}
			return acc;
		}, {}) || {};

	const popularReactions = Object.entries(reactionCounts)
		.sort(([, countA], [, countB]) => countB - countA)
		.slice(0, 3)
		.map(([type]) => type) as ReactionType[];

	return {
		...document,
		popularReactions,
	};
}

export default getDocumentWithTopReactions;
