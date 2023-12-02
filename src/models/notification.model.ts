import { Schema, model, ObjectId, Document } from "mongoose";

export const NotificationType = [
	"reaction",
	"comment",
	"request received",
	"request accepted",
	"birthday",
] as const;

const NotificationContentType = ["post", "comment"] as const;

export interface INotification extends Document {
	type: (typeof NotificationType)[number];
	to: ObjectId;
	from: ObjectId[];
	contentId?: ObjectId;
	contentType?: (typeof NotificationContentType)[number];
	postId?: ObjectId;
	isRead: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface INotificationGroup extends INotification {
	fromUsers: ObjectId[];
	count: number;
}

const NotificationSchema = new Schema<INotification>(
	{
		type: { type: String, required: true, enum: NotificationType },
		to: { type: Schema.Types.ObjectId, ref: "User", required: true },
		from: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
		contentId: { type: Schema.Types.ObjectId },
		contentType: { type: String, enum: NotificationContentType },
		postId: { type: Schema.Types.ObjectId, ref: "Post" },
		isRead: { type: Boolean, default: false },
	},
	{ timestamps: true },
);

export default model<INotification>("Notification", NotificationSchema);
