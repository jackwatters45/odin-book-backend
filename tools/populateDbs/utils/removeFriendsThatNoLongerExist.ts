import { ObjectId } from "mongoose";
import debug from "debug";

import User from "../../../src/models/user.model";
import { configDb, disconnectFromDatabase } from "../../../src/config/database";

const log = debug("log:removeFriendsThatNoLongerExist");

export const removeFriendsThatNoLongerExist = async (includeConfig = false) => {
	if (includeConfig) await configDb();

	const users = await User.find({}).select("_id  friends");
	const userIdsSet = new Set(users.map((u) => String(u._id)));

	log("Removing friends that no longer exist...");

	for (const user of users) {
		const friends = user.friends as ObjectId[];

		const friendsThatNoLongerExist = friends.filter(
			(f) => !userIdsSet.has(String(f)),
		);

		if (friendsThatNoLongerExist.length) {
			await User.findByIdAndUpdate(user._id, {
				$pull: { friends: { $in: friendsThatNoLongerExist } },
			});
		}
	}

	log("Finished removing friends that no longer exist");

	if (includeConfig) await disconnectFromDatabase();
};

// removeFriendsThatNoLongerExist().catch(console.error);
