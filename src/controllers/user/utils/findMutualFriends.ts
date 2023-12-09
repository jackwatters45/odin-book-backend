import { PipelineStage } from "mongoose";
import User from "../../../models/user.model";

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
		{ $sort: { count: -1 } },
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
					mutualFriend: { fullName: 1, avatarUrl: 1 },
				},
			},
		]);
	}

	const mutualFriends = await User.aggregate(pipeline);

	return populate
		? mutualFriends.map((doc) => doc.mutualFriend)
		: mutualFriends.map((doc) => doc._id);
};
