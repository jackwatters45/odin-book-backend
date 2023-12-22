import { ObjectId, PipelineStage } from "mongoose";
import debug from "debug";

import User from "../../../models/user.model";
import { UserPreview } from "../../../../types/user";

const log = debug("log:findMutualFriends");

const findMutualFriends = async (
	userId1: ObjectId | undefined,
	userId2: ObjectId | undefined,
	populate = true,
): Promise<(ObjectId | undefined)[] | UserPreview[]> => {
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
	) as UserPreview[];

	return populate ? mutualFriends : mutualFriends.map((doc) => doc._id);
};

export default findMutualFriends;
