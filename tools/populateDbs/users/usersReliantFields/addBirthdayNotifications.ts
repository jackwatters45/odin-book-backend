import Notification from "../../../../src/models/notification.model";
import User, { IUser } from "../../../../src/models/user.model";

const getMostRecentBirthday = (birthday: Date, userId: string) => {
	const today = new Date();

	if (!birthday) throw new Error(`No birthday provided ${userId}`);
	const mostRecentBirthday = new Date(
		today.getFullYear(),
		birthday.getMonth(),
		birthday.getDate(),
	);

	if (mostRecentBirthday > today) {
		mostRecentBirthday.setFullYear(mostRecentBirthday.getFullYear() - 1);
	}

	return mostRecentBirthday;
};

export const addBirthdayNotifications = async (user: IUser) => {
	const mostRecentBirthday = getMostRecentBirthday(user.birthday, user._id);

	const notifications = user.friends.map((friend) => ({
		to: friend,
		from: [user._id],
		type: "birthday",
		createdAt: mostRecentBirthday,
		updatedAt: mostRecentBirthday,
	}));

	await Notification.insertMany(notifications);
};

export const addBirthdayNotificationsToAllUsers = async (users?: IUser[]) => {
	const usersToAddBDays = users
		? users
		: await User.find().select("_id birthday friends").lean();

	await Promise.all(usersToAddBDays.map(addBirthdayNotifications));
};
