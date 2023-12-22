import { Schema, model, Document, ObjectId } from "mongoose";
import { IUser } from "./user.model";

export interface IComment extends Document {
	content: string;
	author: ObjectId | IUser;
	createdAt: Date;
	updatedAt: Date;
	post: ObjectId;
	parentComment?: ObjectId;
	replies: ObjectId[];
	reactions: ObjectId[];
	isDeleted?: boolean;
}

const commentSchema = new Schema<IComment>(
	{
		content: { type: String, required: true, trim: true, maxlength: 8000 },
		author: { type: Schema.Types.ObjectId, ref: "User", required: true },
		post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
		parentComment: { type: Schema.Types.ObjectId, ref: "Comment" },
		replies: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
		isDeleted: { type: Boolean, default: false },
		reactions: [{ type: Schema.Types.ObjectId, ref: "Reaction" }],
	},
	{ timestamps: true },
);

commentSchema.path("reactions").default([]);
commentSchema.path("replies").default([]);

export default model<IComment>("Comment", commentSchema);
