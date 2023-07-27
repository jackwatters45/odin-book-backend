import { Schema, model, Document, ObjectId } from "mongoose";

export interface IComment extends Document {
	content: string;
	author: ObjectId;
	createdAt: Date;
	updatedAt: Date;
	post: ObjectId;
	parentComment?: ObjectId;
	replies: ObjectId[];
	reactions: { user: ObjectId; type: string }[];
	isDeleted?: boolean;
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

const commentSchema = new Schema<IComment>(
	{
		content: { type: String, required: true, trim: true, maxlength: 8000 },
		author: { type: Schema.Types.ObjectId, ref: "User", required: true },
		post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
		parentComment: { type: Schema.Types.ObjectId, ref: "Comment" },
		replies: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
		isDeleted: { type: Boolean, default: false },
		reactions: [
			{
				user: { type: Schema.Types.ObjectId, ref: "User", required: true },
				type: { type: String, required: true, enum: reactionTypes },
			},
		],
	},
	{ timestamps: true },
);

commentSchema.path("reactions").default([]);
commentSchema.path("replies").default([]);

export default model<IComment>("Comment", commentSchema);
