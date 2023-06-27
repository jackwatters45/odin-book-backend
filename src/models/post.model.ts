import { Schema, model, Document, ObjectId } from "mongoose";

export interface IPost extends Document {
	content: string;
	author: ObjectId;
	published: boolean;
	createdAt: Date;
	updatedAt: Date;
	likes: ObjectId[];
	comments: ObjectId[];
	sharedFrom?: ObjectId;
	media?: string;
}

const postSchema = new Schema<IPost>(
	{
		content: { type: String, trim: true, required: true, maxlength: 63206 },
		author: { type: Schema.Types.ObjectId, ref: "User", required: true },
		published: { type: Boolean, required: true, default: false },
		likes: [{ type: Schema.Types.ObjectId, ref: "Like" }],
		comments: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
		sharedFrom: { type: Schema.Types.ObjectId, ref: "Post" },
		media: { type: String },
	},
	{ timestamps: true },
);

postSchema.path("likes").default([]);
postSchema.path("comments").default([]);

export default model<IPost>("Post", postSchema);
