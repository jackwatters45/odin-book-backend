import { Schema, model, ObjectId, Document } from "mongoose";

export interface ILike extends Document {
	user: ObjectId;
	post: ObjectId;
	createdAt: Date;
}

const LikeSchema = new Schema<ILike>(
	{
		user: { type: Schema.Types.ObjectId, ref: "User", required: true },
		post: { type: Schema.Types.ObjectId, ref: "Post", required: true },
	},
	{ timestamps: true },
);

export default model<ILike>("Like", LikeSchema);
