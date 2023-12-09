import { ObjectId, Schema, model } from "mongoose";

export interface IReaction extends Document {
	parent: ObjectId;
	user: ObjectId;
	type: string;
	updatedAt: Date;
	createdAt: Date;
}

export const reactionTypes = [
	"like",
	"dislike",
	"love",
	"haha",
	"wow",
	"sad",
	"angry",
	"hooray",
	"confused",
] as const;

export type ReactionType = (typeof reactionTypes)[number];

export const reactionTypeEmojis: Record<ReactionType, string> = {
	like: "👍",
	dislike: "👎",
	love: "❤️",
	haha: "😂",
	wow: "😮",
	sad: "😢",
	angry: "😡",
	hooray: "🎉",
	confused: "😕",
} as const;

export const getReactionTypeEmoji = (type: ReactionType) =>
	reactionTypeEmojis[type];

const reactionSchema = new Schema<IReaction>(
	{
		parent: { type: Schema.Types.ObjectId, required: true },
		user: { type: Schema.Types.ObjectId, ref: "User", required: true },
		type: { type: String, required: true, enum: reactionTypes },
	},
	{ timestamps: true },
);

export default model<IReaction>("Reaction", reactionSchema);
