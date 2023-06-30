import { Schema, model, Document, ObjectId } from "mongoose";

export interface IComment extends Document {
	content: string;
	author: ObjectId;
	createdAt: Date;
	updatedAt: Date;
	post: ObjectId;
	parentComment?: ObjectId;
	replies: ObjectId[];
	likes: ObjectId[];
}

const commentSchema = new Schema<IComment>(
	{
		content: { type: String, required: true, trim: true, maxlength: 8000 },
		author: { type: Schema.Types.ObjectId, ref: "User", required: true },
		post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
		parentComment: { type: Schema.Types.ObjectId, ref: "Comment" },
		replies: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
		likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
	},
	{ timestamps: true },
);

commentSchema.path("likes").default([]);
commentSchema.path("replies").default([]);

export default model<IComment>("Comment", commentSchema);
