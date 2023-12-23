import { ObjectId } from "mongoose";
import debug from "debug";

import User from "../../../src/models/user.model";
import { configDb, disconnectFromDatabase } from "../../../src/config/database";

const log = debug("log:removeFriendsThatNoLongerExist");

export const removeUserDataThatNoLongerExists = async (
	includeConfig = false,
) => {
	if (includeConfig) await configDb();

	const users = await User.find({}).select(
		"_id  friends friendRequestsReceived friendRequestsSent",
	);

	const userIdsSet = new Set(users.map((u) => String(u._id)));

	log("Removing friends that no longer exist...");

	for (const user of users) {
		const friends = (user.friends || []) as ObjectId[];

		const friendsThatNoLongerExist = friends.filter(
			(f) => !userIdsSet.has(String(f)),
		);

		const friendRequestsReceivedThatNoLongerExist =
			user.friendRequestsReceived?.filter((f) => !userIdsSet.has(String(f)));

		const friendRequestsSentThatNoLongerExist = user.friendRequestsSent?.filter(
			(f) => !userIdsSet.has(String(f)),
		);

		if (friendsThatNoLongerExist?.length) {
			await User.findByIdAndUpdate(user._id, {
				$pull: { friends: { $in: friendsThatNoLongerExist } },
			});
		}

		if (friendRequestsReceivedThatNoLongerExist?.length) {
			await User.findByIdAndUpdate(user._id, {
				$pull: {
					friendRequestsReceived: {
						$in: friendRequestsReceivedThatNoLongerExist,
					},
				},
			});
		}

		if (friendRequestsSentThatNoLongerExist?.length) {
			await User.findByIdAndUpdate(user._id, {
				$pull: {
					friendRequestsSent: {
						$in: friendRequestsSentThatNoLongerExist,
					},
				},
			});
		}
	}

	// remove saved posts, tagged posts, family members
	await User.updateMany(
		{},
		{
			$pull: { familyMembers: { user: { $nin: [...userIdsSet] } } },
			$set: { savedPosts: [], taggedPosts: [] },
		},
	);

	log("Finished removing friends that no longer exist");

	if (includeConfig) await disconnectFromDatabase();
};

// removeUserDataThatNoLongerExists(true).catch(console.error);
