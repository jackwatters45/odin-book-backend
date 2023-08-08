import { Schema, model, Document, ObjectId } from "mongoose";
import { LifeEventData } from "./user-model/user-about.model";

export interface IPost extends Document {
	content?: string;
	author: ObjectId;
	published: boolean;
	createdAt: Date;
	updatedAt: Date;
	reactions: ObjectId[];
	comments: ObjectId[];
	sharedFrom?: ObjectId; // shared from another post
	media?: string[];
	taggedUsers?: ObjectId[];
	feeling?: string;
	lifeEvent?: LifeEventData;
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
		media: [{ type: String }],
		feeling: { type: String },
		lifeEvent: {
			type: new Schema(
				{
					title: { type: String, required: true, trim: true, maxlength: 100 },
					description: { type: String, trim: true, maxlength: 500 },
					date: { type: Date, required: true },
				},
				{ _id: false },
			),
		},
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
