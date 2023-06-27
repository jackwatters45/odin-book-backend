import { Schema, model, Document, ObjectId } from "mongoose";

export interface IComment extends Document {
	content: string;
	author: ObjectId;
	createdAt: Date;
	updatedAt: Date;
	post: ObjectId;
	likes: ObjectId[];
	parentComment?: ObjectId;
	replies: ObjectId[];
}

const commentSchema = new Schema<IComment>(
	{
		content: { type: String, required: true, trim: true, maxlength: 8000 },
		author: { type: Schema.Types.ObjectId, ref: "User", required: true },
		post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
		likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
		parentComment: { type: Schema.Types.ObjectId, ref: "Comment" },
		replies: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
	},
	{ timestamps: true },
);

commentSchema.path("likes").default([]);
commentSchema.path("replies").default([]);

export default model<IComment>("Comment", commentSchema);
