import { faker } from "@faker-js/faker";
import { ObjectId } from "mongoose";

import {
	getRandValueFromArray,
	getRandValuesFromArray,
} from "../../utils/populateHelperFunctions";
import ICreatePostOptions from "../../../../types/ICreatePostOptions";

export const feelings = [
	"Happy",
	"Sad",
	"Angry",
	"Surprised",
	"Silly",
	"Confused",
	"Excited",
	"Nervous",
	"In Love",
	"Inspired",
	"Bored",
	"Sleepy",
	"Anxious",
	"Content",
	"Optimistic",
	"Pessimistic",
	"Frustrated",
	"Impressed",
	"Nostalgic",
	"Overwhelmed",
	"Relieved",
	"Shocked",
];

const getPostData = (users: ObjectId[], options?: ICreatePostOptions) => ({
	content: faker.lorem.paragraph(),
	published: options?.allPublished ? true : faker.datatype.boolean(0.8),
	feeling: faker.datatype.boolean(0.2) ? getRandValueFromArray(feelings) : null,
	media: faker.datatype.boolean(0.25) ? faker.image.urlLoremFlickr() : null,
	checkIn: faker.datatype.boolean(0.1)
		? {
				longitude: faker.location.longitude(),
				latitude: faker.location.latitude(),
		  }
		: null,
	lifeEvent: faker.datatype.boolean(0.1)
		? {
				title: faker.lorem.sentence(),
				description: faker.lorem.paragraph(),
				date: faker.date.past(),
		  }
		: null,
	author: options?.author || getRandValueFromArray(users),
	likes: getRandValuesFromArray(users, 20),
	taggedUsers: getRandValuesFromArray(users, 5),
});

export default getPostData;
