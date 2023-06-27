import { Schema, model, Document, ObjectId } from "mongoose";

export interface IFriendRequest extends Document {
	sender: ObjectId;
	receiver: ObjectId;
	status: string;
	createdAt: Date;
	updatedAt: Date;
}

const FriendRequestSchema = new Schema<IFriendRequest>(
	{
		sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
		receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
		status: {
			type: String,
			enum: ["pending", "accepted", "declined", "cancelled"],
			default: "pending",
		},
	},
	{ timestamps: true },
);

export default model<IFriendRequest>("FriendRequest", FriendRequestSchema);
