import cron from "node-cron";
import expressAsyncHandler from "express-async-handler";
import debug from "debug";
import { Request, Response } from "express";

import authenticateJwt from "../../middleware/authenticateJwt";
import User, { IUser } from "../../models/user.model";
import Notification from "../../models/notification.model";
import { updateNotificationCount } from "./utils/updateNotificationCount";

const log = debug("log:notificationsController");

// 	@desc    Get notification count
// 	@route   GET /notifications/count
// 	@access  Private
export const getNotificationCount = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		const userNotificationCount = await Notification.countDocuments({
			to: user._id,
			isRead: false,
		});

		res.status(200).json(userNotificationCount);
	}),
];

// @desc    Get all notifications
// @route   GET /notifications/all
// @access  Private
export const getNotifications = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		const pageLength = 20;
		const limit = req.query.limit
			? parseInt(req.query.limit as string)
			: pageLength;
		const page = req.query.page ? parseInt(req.query.page as string) : 0;

		const notifications = await Notification.find({ to: user._id })
			.sort({ createdAt: -1 })
			.skip(page * limit)
			.limit(limit)
			.populate("from", "fullName avatarUrl")
			.lean();

		res.status(200).json(notifications);
	}),
];

// 	@desc    Get all unread notifications
// 	@route   GET /notifications/unread
// 	@access  Private
export const getUnreadNotifications = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		const pageLength = 20;
		const limit = req.query.limit
			? parseInt(req.query.limit as string)
			: pageLength;
		const page = req.query.page ? parseInt(req.query.page as string) : 0;

		const notifications = await Notification.find({
			to: user._id,
			isRead: false,
		})
			.sort({ createdAt: -1 })
			.skip(page * limit)
			.limit(limit)
			.populate("from", "fullName avatarUrl")
			.lean();

		res.status(200).json(notifications);
	}),
];

//  @desc    Read a notification
//  @route   PATCH /notifications/:id/read
//  @access  Private
export const readNotification = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

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
//  @access  Private
export const readAllNotifications = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		await Notification.updateMany({ to: user._id }, { isRead: true });

		res.status(200).json({
			message: "All notifications have been marked as read.",
		});
	}),
];

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
