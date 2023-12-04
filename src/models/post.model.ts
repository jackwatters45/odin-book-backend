import { Schema, model, Document, ObjectId } from "mongoose";
import {
	AUDIENCE_STATUS_OPTIONS,
	AudienceStatusOptionsType,
} from "../../types/audience";

export interface CheckInValues {
	location: string;
	city: string;
	state: string;
	country: string;
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

export interface IReaction {
	_id: string;
	parent: string;
	user: ObjectId;
	type: ReactionType;
	updatedAt: Date;
	createdAt: Date;
}

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

export interface IPostObject {
	content?: string;
	author: ObjectId;
	createdAt: Date;
	updatedAt: Date;
	reactions: ObjectId[];
	comments: ObjectId[];
	audience: AudienceStatusOptionsType;
	sharedFrom?: ObjectId; // shared from another post
	to: ObjectId; // post to another user
	media?: string[];
	taggedUsers?: ObjectId[];
	feeling?: string;
	checkIn?: CheckInValues;
}

export interface IPost extends Document, IPostObject {}

const postSchema = new Schema<IPost>(
	{
		author: { type: Schema.Types.ObjectId, ref: "User", required: true },
		reactions: [{ type: Schema.Types.ObjectId, ref: "Reaction" }],
		sharedFrom: {
			type: Schema.Types.ObjectId,
			ref: "Post",
			default: undefined,
		},
		to: { type: Schema.Types.ObjectId, ref: "User", default: undefined },
		content: { type: String, trim: true, maxlength: 63206 },
		media: [{ type: String, trim: true }],
		feeling: { type: String },
		audience: {
			type: String,
			default: "Friends",
			enum: AUDIENCE_STATUS_OPTIONS,
		},
		comments: {
			type: [{ type: Schema.Types.ObjectId, ref: "Comment" }],
			default: [],
		},
		taggedUsers: {
			type: [{ type: Schema.Types.ObjectId, ref: "User" }],
			default: [],
		},
		checkIn: {
			type: new Schema(
				{
					location: { type: String },
					city: { type: String },
					state: { type: String },
					country: { type: String },
				},
				{ _id: false },
			),
		},
	},
	{ timestamps: true },
);

postSchema.path("content").validate(function (value: string) {
	return (
		this.sharedFrom ||
		this.media ||
		this.checkIn ||
		this.feeling ||
		(value && value.trim() !== "")
	);
}, "Content is required when sharedFrom, media, checkIn or feeling is not provided");

export default model<IPost>("Post", postSchema);
