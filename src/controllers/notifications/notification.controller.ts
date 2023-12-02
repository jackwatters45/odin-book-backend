import cron from "node-cron";
import { Request, Response } from "express";
import expressAsyncHandler from "express-async-handler";
import { faker } from "@faker-js/faker";

import authenticateJwt from "../../middleware/authenticateJwt";
import User, { IUser } from "../../models/user.model";
import Post from "../../models/post.model";
import Notification, {
	INotification,
	NotificationType,
} from "../../models/notification.model";
import {
	getRandValueFromArray,
	getRandValueFromArrayOfObjs,
} from "../../../tools/populateDbs/utils/helperFunctions";
import { getIO } from "../../config/socket";
import { getRedis } from "../../config/redis";
import { FilterQuery } from "mongoose";

export const createRandomNotification = async (userId: string) => {
	const users = await User.find({
		_id: { $ne: userId },
	})
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

// 	@desc    Get notification count
// 	@route   GET /notifications/count
// 	@access  Public
export const getNotificationCount = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		if (!user) {
			res
				.status(401)
				.json({ message: "Must be logged in to perform this action." });
			return;
		}

		const userNotificationCount = await Notification.countDocuments({
			to: user._id,
			isRead: false,
		});

		res.status(200).json(userNotificationCount);
	}),
];

// @desc    Get all notifications
// @route   GET /notifications/all
// @access  Public
export const getNotifications = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		if (!user) {
			res
				.status(401)
				.json({ message: "Must be logged in to perform this action." });
			return;
		}

		const pageLength = 20;
		const limit = req.query.limit
			? parseInt(req.query.limit as string)
			: pageLength;
		const page = req.query.page ? parseInt(req.query.page as string) : 0;

		const notifications = await Notification.find({ to: user._id })
			.sort({ updatedAt: -1 })
			.skip(page * limit)
			.limit(limit)
			.populate("from", "fullName avatarUrl");

		res.status(200).json(notifications);
	}),
];

// 	@desc    Get all unread notifications
// 	@route   GET /notifications/unread
// 	@access  Public
export const getUnreadNotifications = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		if (!user) {
			res
				.status(401)
				.json({ message: "Must be logged in to perform this action." });
			return;
		}

		const notifications = await Notification.find({
			to: user._id,
			isRead: false,
		}).populate("from", "fullName avatarUrl");

		res.status(200).json(notifications);
	}),
];

//  @desc    Read a notification
//  @route   PATCH /notifications/:id/read
//  @access  Public
export const readNotification = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		if (!user) {
			res
				.status(401)
				.json({ message: "Must be logged in to perform this action." });
			return;
		}

		const notificationId = req.params.id;
		if (!notificationId) {
			res.status(400).json({ message: "Notification id is required." });
			return;
		}

		const notification = await Notification.findOneAndUpdate(
			{ _id: notificationId, to: user._id },
			{ isRead: true },
			{ new: true },
		);

		if (!notification) {
			res.status(404).json({ message: "Notification not found." });
			return;
		}

		res.status(200).json({
			notification,
			message: "Notification has been marked as read.",
		});
	}),
];

//  @desc    Read all notifications
//  @route   PATCH /notifications/read/all
//  @access  Public
export const readAllNotifications = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		if (!user) {
			res
				.status(401)
				.json({ message: "Must be logged in to perform this action." });
			return;
		}

		await Notification.updateMany({ to: user._id }, { isRead: true });

		res.status(200).json({
			message: "All notifications have been marked as read.",
		});
	}),
];

export const updateNotificationCount = async (userId: string) => {
	const io = getIO();
	const redisClient = getRedis();

	const userNotificationCount = await Notification.countDocuments({
		to: userId,
		isRead: false,
	});

	const userSocketId = await redisClient.get(userId);
	if (userSocketId) {
		io.to(userSocketId).emit("notificationCount", userNotificationCount);
	}
};

// @desc    Create birthday notifications
const createBirthdayNotifications = async () => {
	const today = new Date();
	const startOfDay = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate(),
	);
	const endOfDay = new Date(
		today.getFullYear(),
		today.getMonth(),
		today.getDate() + 1,
	);

	const usersWithBirthday = (await User.find({
		birthday: {
			$gte: startOfDay,
			$lt: endOfDay,
		},
	})) as IUser[];

	for (const user of usersWithBirthday) {
		const notification = new Notification({
			from: user._id,
			to: user.friends,
			type: "birthday",
		});

		await notification.save();

		await updateNotificationCount(user._id);
	}
};

cron.schedule("0 0 * * *", async () => {
	try {
		await createBirthdayNotifications();
	} catch (err) {
		console.error("Error sending birthday notifications:", err);
	}
});

interface ICreateNotification {
	query: FilterQuery<INotification>;
	from: string | string[];
	date?: Date;
	includeSocket?: boolean;
}

export const createNotificationWithMultipleFrom = async ({
	query,
	from,
	date = new Date(),
	includeSocket = true,
}: ICreateNotification) => {
	const fromArray = Array.isArray(from) ? from : [from];

	const existingNotification = await Notification.exists(query);

	if (existingNotification) {
		await Notification.findOneAndUpdate(query, {
			$addToSet: { from: { $each: fromArray } },
			updatedAt: date,
		});
	} else {
		await Notification.create({
			...query,
			from: fromArray,
			updatedAt: date,
			createdAt: date || undefined,
		});
	}

	if (includeSocket) await updateNotificationCount(query.to as string);
};

interface IRemoveNotification {
	query: FilterQuery<INotification>;
	remove: string;
}

export const removeUserFromNotificationMultipleFrom = async ({
	query,
	remove,
}: IRemoveNotification) => {
	await Notification.updateOne(query, {
		$pull: { from: remove },
	});

	await updateNotificationCount(query.to as string);
};

export const removeNotificationsFromDeletedPost = async (
	postId: string,
	postAuthor: string,
) => {
	await Notification.deleteMany({ contentId: postId, contentType: "post" });

	await updateNotificationCount(postAuthor);
};

interface IFriendRequestNotification {
	to: string;
	from: string;
}

export const createNotificationForFriendRequest = async ({
	to,
	from,
}: IFriendRequestNotification) => {
	await Notification.create({ to, from, type: "request received" });

	await updateNotificationCount(to);
};

export const removeNotificationForFriendRequest = async ({
	to,
	from,
}: IFriendRequestNotification) => {
	await Notification.findOneAndDelete({ to, from, type: "request received" });

	await updateNotificationCount(to);
};

interface IAcceptFriendRequestNotification {
	userAccepting: string;
	userRequesting: string;
}

export const createNotificationForAcceptedFriendRequest = async ({
	userAccepting,
	userRequesting,
}: IAcceptFriendRequestNotification) => {
	await Notification.findOneAndUpdate(
		{ to: userAccepting, from: userRequesting, type: "request received" },
		{ $set: { type: "request accepted", isRead: false } },
	);

	await Notification.create({
		to: userRequesting,
		from: userAccepting,
		type: "request accepted",
	});

	await updateNotificationCount(userAccepting);
	await updateNotificationCount(userRequesting);
};
