import { ObjectId, Schema, model } from "mongoose";

export interface IReaction {
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
	"heart",
];

const reactionSchema = new Schema<IReaction>(
	{
		parent: { type: Schema.Types.ObjectId, required: true },
		user: { type: Schema.Types.ObjectId, ref: "User", required: true },
		type: { type: String, required: true, enum: reactionTypes },
	},
	{ timestamps: true },
);

export default model<IReaction>("Reaction", reactionSchema);
