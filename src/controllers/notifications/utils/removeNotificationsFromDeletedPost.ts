import Notification from "../../../models/notification.model";
import { updateNotificationCount } from "./updateNotificationCount";

export const removeNotificationsFromDeletedPost = async (
	postId: string,
	postAuthor: string,
) => {
	await Notification.deleteMany({ contentId: postId, contentType: "post" });

	await updateNotificationCount(postAuthor);
};
