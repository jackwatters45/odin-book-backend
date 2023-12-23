import Notification from "../../../src/models/notification.model";

const readNotificationsOlderThanTwoWeeks = async () => {
	const twoWeeksAgo = new Date();
	twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

	await Notification.updateMany(
		{ createdAt: { $lte: twoWeeksAgo } },
		{ $set: { isRead: true } },
		{ multi: true },
	);
};

export default readNotificationsOlderThanTwoWeeks;
