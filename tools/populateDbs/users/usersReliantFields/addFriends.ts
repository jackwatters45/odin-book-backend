import { ObjectId } from "mongoose";

import User from "../../../../src/models/user.model";
import { IUser, IUserWithId } from "../../../../types/IUser";
import {
	getRandValuesFromArrayOfObjs,
	getRandomInt,
} from "../../utils/populateHelperFunctions";

interface addItemsToUserFieldParams {
	user: IUser;
	users: IUser[];
	field: string;
	secondField?: string;
	limit?: number;
}

const addItemsToUserField = async ({
	user,
	users,
	field,
	secondField,
	limit,
}: addItemsToUserFieldParams): Promise<IUser> => {
	const numValues = getRandomInt(limit || users.length) - 1;
	const itemsToAdd: ObjectId[] = getRandValuesFromArrayOfObjs(
		users as IUserWithId[],
		numValues,
	);

	try {
		const updateItemPromises = itemsToAdd.map((item) =>
			User.findByIdAndUpdate(item, {
				$addToSet: { [secondField || field]: user._id },
			}),
		);

		await Promise.all(updateItemPromises);

		return (await User.findByIdAndUpdate(user._id, {
			$addToSet: { [field]: { $each: itemsToAdd } },
		})) as IUser;
	} catch (error) {
		throw new Error(error);
	}
};

interface addToAllParams {
	users: IUser[];
	cb: (params: addItemsToUserFieldParams) => Promise<IUser>;
	field: string;
	secondField?: string;
	limit?: number;
}

const addToAll = async ({
	users,
	cb,
	field,
	secondField,
	limit,
}: addToAllParams) => {
	return await Promise.all(
		users.map((user) => cb({ user, users, field, secondField, limit })),
	);
};

export const addFriends = async (users: IUser[]) =>
	addToAll({
		users,
		cb: addItemsToUserField,
		field: "friends",
	});

export const addFriendRequestsReceived = async (users: IUser[]) =>
	addToAll({
		users,
		cb: addItemsToUserField,
		field: "friendRequestsReceived",
		secondField: "friendRequestsSent",
		limit: 5,
	});

export const addFriendRequestsSent = async (users: IUser[]) =>
	addToAll({
		users,
		cb: addItemsToUserField,
		field: "friendRequestsSent",
		secondField: "friendRequestsReceived",
		limit: 5,
	});
