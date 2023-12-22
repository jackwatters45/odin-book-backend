import { ObjectId } from "mongoose";

import { getRedis } from "../../../config/redis";
import { getIO } from "../../../config/socket";
import Notification from "../../../models/notification.model";

export const updateNotificationCount = async (userId: string | ObjectId) => {
	const io = getIO();
	const redisClient = getRedis();

	const userNotificationCount = await Notification.countDocuments({
		to: userId,
		isRead: false,
	});

	const userSocketId = await redisClient.get(String(userId));
	if (userSocketId) {
		io.to(userSocketId).emit("notificationCount", userNotificationCount);
	}
};
