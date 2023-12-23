import { faker } from "@faker-js/faker";
import { ObjectId } from "mongoose";
import debug from "debug";

import {
	getRandValueFromArray,
	getRandValueFromArrayOfObjs,
	getRandValuesFromArray,
} from "../../utils/helperFunctions";
import Post from "../../../../src/models/post.model";
import getRandAudienceSetting from "../../utils/getRandAudienceSetting";
import { FEELINGS } from "../../../../types/feelings";
import { IUser } from "../../../../src/models/user.model";

const log = debug("log:populateUsers");

export const getSharedPostData = async (user: IUser) => {
	const createdAt = faker.date.between({
		from: new Date(user.createdAt),
		to: new Date(),
	});

	const sharedFrom = (
		await Post.aggregate([
			{ $match: { author: { $ne: user._id } } },
			{ $sample: { size: 1 } },
			{ $project: { _id: 1 } },
		])
	)[0]?._id;

	return {
		content: faker.lorem.paragraph(),
		author: user._id,
		createdAt,
		updatedAt: createdAt,
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
	const createdAt = faker.date.between({
		from: new Date(user.createdAt),
		to: new Date(),
	});
	const friends = user.friends as ObjectId[];

	return {
		content: faker.lorem.paragraph(),
		author: user._id,
		createdAt,
		updatedAt: createdAt,
		audience: getRandAudienceSetting(),
		media: faker.datatype.boolean(0.25) ? faker.image.urlLoremFlickr() : null,
		taggedUsers:
			faker.datatype.boolean(0.2) && !!friends.length
				? getRandValuesFromArray(friends)
				: null,
		feeling: faker.datatype.boolean(0.2)
			? getRandValueFromArrayOfObjs(FEELINGS, "name")
			: null,
		checkIn: faker.datatype.boolean(0.1) ? createCheckIn() : null,
		to:
			faker.datatype.boolean(0.1) && !!friends.length
				? getRandValueFromArray(friends)
				: null,

		reactions: [],
		comments: [],
		sharedFrom: null,
	};
};
