import Notification from "../../../models/notification.model";
import { updateNotificationCount } from "./updateNotificationCount";

export const removeNotificationsFromDeletedPost = async (
	postId: string,
	postAuthor: string,
) => {
	await Notification.deleteMany({ $or: [{ postId }, { contentId: postId }] });

	await updateNotificationCount(postAuthor);
};
