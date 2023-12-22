import Notification from "../../../models/notification.model";
import { updateNotificationCount } from "./updateNotificationCount";

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
	await Notification.findOneAndDelete({
		to,
		from: { $in: [from] },
		type: "request received",
	});

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
	await Notification.findOneAndDelete({
		to: userAccepting,
		from: userRequesting,
		type: "request received",
	});

	await Notification.create({
		to: userAccepting,
		from: userRequesting,
		type: "request accepted",
	});

	await Notification.create({
		to: userRequesting,
		from: userAccepting,
		type: "request accepted",
	});

	await updateNotificationCount(userAccepting);
	await updateNotificationCount(userRequesting);
};
