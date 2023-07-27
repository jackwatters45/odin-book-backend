import { Schema, model, ObjectId, Document } from "mongoose";

export interface INotification extends Document {
	receiver: ObjectId;
	sender: ObjectId;
	type: string;
	read: boolean;
	contentId: ObjectId;
	createdAt: Date;
	updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
	{
		receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
		sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
		type: { type: String, required: true },
		read: { type: Boolean, default: false },
		contentId: { type: Schema.Types.ObjectId, required: true },
	},
	{ timestamps: true },
);

export default model<INotification>("Notification", NotificationSchema);
