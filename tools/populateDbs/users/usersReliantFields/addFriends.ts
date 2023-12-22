import debug from "debug";

import Notification, {
	INotification,
} from "../../../../src/models/notification.model";
import User, { IUser } from "../../../../src/models/user.model";
import {
	getRandValuesFromArrayOfObjs,
	getRandomInt,
} from "../../utils/helperFunctions";
import { getNotificationBetweenDates } from "../../utils/getNotificationBetweenDates";

const log = debug("log:addFriends");

export const addFriendsDataToUser = async (user: IUser) => {
	const users = await User.find({
		_id: { $ne: user._id },
		$and: [
			{ friends: { $nin: [user._id] } },
			{ friendRequestsReceived: { $nin: [user._id] } },
			{ friendRequestsSent: { $nin: [user._id] } },
		],
	})
		.select("_id")
		.lean();

	const numValues = getRandomInt(users.length * 0.33);

	log(`Adding ${numValues} friends to user ${user._id}`);

	const friendsToAdd = getRandValuesFromArrayOfObjs(users, numValues);

	await User.findByIdAndUpdate(user._id, {
		$addToSet: { friends: { $each: friendsToAdd } },
	});

	await Promise.all(
		friendsToAdd.map((friend) =>
			User.findByIdAndUpdate(friend, {
				$addToSet: { friends: user._id },
			}),
		),
	);

	const date = getNotificationBetweenDates();

	const friendsNotifications: Promise<INotification>[] = [];
	for (const friend of friendsToAdd) {
		const notification = Notification.create({
			to: user._id,
			from: [friend],
			type: "request accepted",
			createdAt: date,
			updatedAt: date,
		}) as Promise<INotification>;
		friendsNotifications.push(notification);

		const notification2 = Notification.create({
			to: friend,
			from: [user._id],
			type: "request accepted",
		}) as Promise<INotification>;
		friendsNotifications.push(notification2);
	}

	await Promise.all(friendsNotifications);
};

export const addFriendRequestsReceivedDataToUser = async (user: IUser) => {
	const users = await User.find({
		_id: { $ne: user._id },
		$and: [
			{ friends: { $nin: [user._id] } },
			{ friendRequestsReceived: { $nin: [user._id] } },
			{ friendRequestsSent: { $nin: [user._id] } },
		],
	})
		.select("_id")
		.lean();

	const numValues = getRandomInt(10);

	log(`Adding ${numValues} friendRequestsReceived to user ${user._id}`);

	const friendRequestsReceivedToAdd = getRandValuesFromArrayOfObjs(
		users,
		numValues,
	);

	await User.findByIdAndUpdate(user._id, {
		$addToSet: {
			friendRequestsReceived: { $each: friendRequestsReceivedToAdd },
		},
	});

	await Promise.all(
		friendRequestsReceivedToAdd.map((friend) =>
			User.findByIdAndUpdate(friend, {
				$addToSet: { friendRequestsSent: user._id },
			}),
		),
	);

	const date = getNotificationBetweenDates();

	const friendRequestsReceivedNotifications: Promise<INotification>[] = [];
	for (const friend of friendRequestsReceivedToAdd) {
		const receivedNotification = Notification.create({
			to: user._id,
			from: [friend],
			type: "request received",
			createdAt: date,
			updatedAt: date,
		}) as Promise<INotification>;
		friendRequestsReceivedNotifications.push(receivedNotification);
	}

	await Promise.all(friendRequestsReceivedNotifications);
};

export const addFriendRequestsSentDataToUser = async (user: IUser) => {
	const users = await User.find({
		_id: { $ne: user._id },
		$and: [
			{ friends: { $nin: [user._id] } },
			{ friendRequestsReceived: { $nin: [user._id] } },
			{ friendRequestsSent: { $nin: [user._id] } },
		],
	})
		.select("_id")
		.lean();

	const numValues = getRandomInt(5);

	log(`Adding ${numValues} friendRequestsSent to user ${user._id}`);

	const friendRequestsSentToAdd = getRandValuesFromArrayOfObjs(
		users,
		numValues,
	);

	await User.findByIdAndUpdate(user._id, {
		$addToSet: { friendRequestsSent: { $each: friendRequestsSentToAdd } },
	});

	await Promise.all(
		friendRequestsSentToAdd.map((friend) =>
			User.findByIdAndUpdate(friend, {
				$addToSet: { friendRequestsReceived: user._id },
			}),
		),
	);

	const date = getNotificationBetweenDates();

	const friendRequestsSentNotifications: Promise<INotification>[] = [];
	for (const friend of friendRequestsSentToAdd) {
		const receivedNotification = Notification.create({
			to: friend,
			from: [user._id],
			type: "request received",
			createdAt: date,
			updatedAt: date,
		}) as Promise<INotification>;
		friendRequestsSentNotifications.push(receivedNotification);
	}

	await Promise.all(friendRequestsSentNotifications);
};

const BATCH_SIZE = 200;

export const processInBatches = async (
	totalUsers: IUser[],
	processFunction: (user: IUser) => Promise<void>,
) => {
	for (let i = 0; i < totalUsers.length; i += BATCH_SIZE) {
		const batch = totalUsers.slice(i, i + BATCH_SIZE);
		await Promise.all(batch.map((user) => processFunction(user))).catch(
			(error) => console.error("Batch processing error:", error),
		);
	}
};

export const addFriendsAndRequests = async (users: IUser[]) => {
	await processInBatches(users, addFriendsDataToUser);
	await processInBatches(users, addFriendRequestsReceivedDataToUser);
	await processInBatches(users, addFriendRequestsSentDataToUser);
};
