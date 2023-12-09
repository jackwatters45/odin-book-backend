import { PipelineStage } from "mongoose";
import debug from "debug";

import User from "../../../models/user.model";

const log = debug("log:findMutualFriends");

export const findMutualFriends = async (
	userId1: string | undefined,
	userId2: string,
	populate = true,
) => {
	if (!userId1) return [];

	let pipeline: PipelineStage[] = [
		{ $match: { _id: { $in: [userId1, userId2] } } },
		{ $project: { friends: 1 } },
		{ $unwind: "$friends" },
		{ $group: { _id: "$friends", count: { $sum: 1 } } },
		{ $match: { count: { $gt: 1 } } },
	];

	if (populate) {
		pipeline = pipeline.concat([
			{
				$lookup: {
					from: "users",
					localField: "_id",
					foreignField: "_id",
					as: "mutualFriend",
				},
			},
			{ $unwind: "$mutualFriend" },
			{
				$project: {
					_id: 1,
					fullName: "$mutualFriend.fullName",
					avatarUrl: "$mutualFriend.avatarUrl",
				},
			},
			{ $sort: { fullName: 1 } },
		]);
	}

	const mutualFriends = (await User.aggregate(pipeline)).sort(
		(a, b) => b.mutualFriends - a.mutualFriends,
	);

	return populate ? mutualFriends : mutualFriends.map((doc) => doc._id);
};
