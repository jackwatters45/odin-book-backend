import { faker } from "@faker-js/faker";
import { ObjectId } from "mongoose";

import {
	getRandValueFromArray,
	getRandValueFromArrayOfObjs,
	getRandValuesFromArray,
} from "../../utils/helperFunctions";
import Post from "../../../../src/models/post.model";
import getRandAudienceSetting from "../../utils/getRandAudienceSetting";
import { FEELINGS } from "../../../../types/feelings";
import { IUser } from "../../../../src/models/user.model";

export const getSharedPostData = async (user: IUser) => {
	const createdAt = faker.date.past();
	const sharedFrom = await Post.findOne({ author: { $ne: user._id } }).select(
		"_id",
	);

	return {
		content: faker.lorem.paragraph(),
		author: user._id,
		createdAt,
		updatedAt: faker.datatype.boolean(0.95)
			? createdAt
			: faker.date.between({ from: createdAt, to: new Date() }),
		audience: getRandAudienceSetting(),
		sharedFrom: sharedFrom ?? undefined,
		reactions: [],
		comments: [],
	};
};

const createCheckIn = () => ({
	location: faker.company.name(),
	city: faker.location.city(),
	state: faker.location.state(),
	country: faker.location.country(),
});

export const getPostData = (user: IUser) => {
	const createdAt = faker.date.past();
	const friends = user.friends as ObjectId[];

	return {
		content: faker.lorem.paragraph(),
		author: user._id,
		createdAt,
		updatedAt: faker.datatype.boolean(0.95)
			? createdAt
			: faker.date.between({ from: createdAt, to: new Date() }),
		audience: getRandAudienceSetting(),
		media: faker.datatype.boolean(0.25) ? faker.image.urlLoremFlickr() : null,
		taggedUsers: faker.datatype.boolean(0.2)
			? getRandValuesFromArray(friends)
			: null,
		feeling: faker.datatype.boolean(0.2)
			? getRandValueFromArrayOfObjs(FEELINGS, "name")
			: null,
		checkIn: faker.datatype.boolean(0.1) ? createCheckIn() : null,
		to: faker.datatype.boolean(0.1) ? getRandValueFromArray(friends) : null,

		reactions: [],
		comments: [],
		sharedFrom: null,
	};
};
