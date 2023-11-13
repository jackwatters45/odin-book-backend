import { ObjectId } from "mongoose";

import Reaction, { reactionTypes } from "../../../../src/models/reaction.model";
import {
	getRandValueFromArray,
	getRandValuesFromArray,
	getRandomInt,
} from "../../utils/populateHelperFunctions";

const addReactions = async (
	parentId: ObjectId,
	users: ObjectId[],
	maxReactions: number,
) => {
	const numReactions = getRandomInt(maxReactions);
	const usersReacting = getRandValuesFromArray(users, numReactions);

	try {
		return await Promise.all(
			usersReacting.map(async (user) => {
				const reaction = new Reaction({
					parent: parentId,
					user,
					type: getRandValueFromArray(reactionTypes),
				});

				await reaction.save();

				return reaction._id;
			}),
		);
	} catch (err) {
		throw new Error(err);
	}
};
export default addReactions;
