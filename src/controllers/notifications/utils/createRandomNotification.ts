import { faker } from "@faker-js/faker";

import User from "../../../models/user.model";
import Post from "../../../models/post.model";
import Notification, {
	INotification,
	NotificationType,
} from "../../../models/notification.model";
import {
	getRandValueFromArray,
	getRandValueFromArrayOfObjs,
} from "../../../../tools/populateDbs/utils/helperFunctions";
import { updateNotificationCount } from "./updateNotificationCount";

export const createRandomNotification = async (userId: string) => {
	const users = await User.find({ _id: { $ne: userId } })
		.select("_id")
		.lean();

	const userPosts = await Post.find({ author: userId }).select("_id").lean();

	const userNotifications = await Notification.find({ to: userId }).lean();

	const today = new Date();
	const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000);

	const notificationDate = faker.date.between({
		from: threeDaysAgo,
		to: today,
	});

	let notification: INotification;
	do {
		const type = getRandValueFromArray(NotificationType);

		notification = new Notification({
			to: userId,
			from: [getRandValueFromArrayOfObjs(users)],
			type: getRandValueFromArray(NotificationType),
			contentId:
				type === "reaction" || type === "comment"
					? getRandValueFromArrayOfObjs(userPosts)
					: undefined,
			contentType:
				type === "reaction" || type === "comment" ? "post" : undefined,
			updatedAt: notificationDate,
			createdAt: notificationDate,
		});
	} while (
		userNotifications.some(
			(n) => n.contentId === notification.contentId && n.type === "reaction",
		)
	);

	await notification.save();

	await updateNotificationCount(userId);
};
