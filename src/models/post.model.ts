import { Schema, model, Document, ObjectId } from "mongoose";
import { LifeEventData } from "../../types/IUser";

export interface PostMedia {
	type: "image" | "video";
	url: string;
}
export interface IPost extends Document {
	content?: string;
	author: ObjectId;
	published: boolean;
	createdAt: Date;
	updatedAt: Date;
	reactions: ObjectId[];
	comments: ObjectId[];
	sharedFrom?: ObjectId; // shared from another post
	media?: PostMedia[];
	taggedUsers?: ObjectId[];
	feeling?: string;
	lifeEvent?: ObjectId | LifeEventData;
	checkIn?: { longitude: number; latitude: number };
}

const postSchema = new Schema<IPost>(
	{
		content: {
			type: String,
			trim: true,
			maxlength: 63206,
		},
		author: { type: Schema.Types.ObjectId, ref: "User", required: true },
		published: { type: Boolean, required: true, default: false },
		reactions: [{ type: Schema.Types.ObjectId, ref: "Reaction" }],
		comments: {
			type: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
			default: [],
		},
		taggedUsers: {
			type: [{ type: Schema.Types.ObjectId, ref: "User" }],
			default: [],
		},
		sharedFrom: { type: Schema.Types.ObjectId, ref: "Post" },
		media: [
			{
				type: new Schema(
					{
						type: {
							type: String,
							required: true,
							enum: ["image", "video"],
						},
						url: { type: String, required: true },
					},
					{ _id: false },
				),
			},
		],
		feeling: { type: String },
		lifeEvent: { type: Schema.Types.ObjectId, ref: "LifeEvent" },
		checkIn: {
			type: new Schema(
				{
					longitude: { type: Number, required: true },
					latitude: { type: Number, required: true },
				},
				{ _id: false },
			),
		},
	},
	{ timestamps: true },
);

// TODO this looks wrong
postSchema.path("content").validate(function (value: string) {
	return (
		this.sharedFrom ||
		this.media ||
		this.lifeEvent ||
		this.checkIn ||
		this.feeling ||
		(value && value.trim() !== "")
	);
}, "Content is required when sharedFrom is not provided");

export default model<IPost>("Post", postSchema);
