import express from "express";
import {
	getNotificationCount,
	getNotifications,
	getUnreadNotifications,
	readAllNotifications,
	readNotification,
} from "../controllers/notifications/notification.controller";

const router = express.Router();

// /notification/count
router.get("/count", getNotificationCount);

// /notification/all
router.get("/all", getNotifications);

// /notification/unread
router.get("/unread", getUnreadNotifications);

// /notification/:id/read
router.patch("/:id/read", readNotification);

// /notification/:id/read/all
router.patch("/read/all", readAllNotifications);

export default router;
