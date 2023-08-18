import { faker } from "@faker-js/faker";

import {
	universityDegreeTypes,
	fieldsOfStudy,
	socialMediaSites,
	highSchoolDegreeTypes,
	highSchoolActivities,
	universityActivities,
} from "./utils/userOptions";
import User from "../../../src/models/user.model";
import { getLifeEvents } from "./utils/life-events";
import {
	convertToSlug,
	getRandValueFromArray,
	getRandValuesFromArrayOfObjs,
	getRandomInt,
} from "../utils/populateHelperFunctions";
import { IPost } from "../../../src/models/post.model";
import debug from "debug";
import {
	addSavedPosts,
	addSavedPostsToUser,
} from "../posts/utils/addSavedPosts";
import { ObjectId } from "mongoose";
import {
	EducationData,
	IUser,
	IUserWithId,
	SocialLinksData,
	UserAboutData,
	UserActivityData,
	UserSystemData,
	WorkData,
} from "../../../types/IUser";

const log = debug("log:populateUsers");

const createRandomBasicInfo = () => {
	const firstName = faker.person.firstName();
	const lastName = faker.person.lastName();
	const email = faker.internet.email({
		firstName,
		lastName,
	});

	const password = faker.internet.password({ length: 10 });
	const avatarUrl = faker.internet.avatar();
	const description = faker.person.bio();
	const phoneNumber = faker.phone.number("+1555#######");
	const birthday = faker.date.past({ years: 50 });

	return {
		firstName,
		lastName,
		email,
		password,
		avatarUrl,
		description,
		phoneNumber,
		birthday,
	};
};

const createRandomSystemData = ({
	userType,
	isDeleted,
	deletedData,
}: UserSystemData) => {
	return {
		userType,
		isDeleted,
		deletedData,
		createdAt: faker.date.past(),
	};
};

const createRandomActivityData = ({
	friends,
	savedPosts,
	friendRequestsReceived,
	friendRequestsSent,
}: UserActivityData) => {
	return {
		friends,
		savedPosts,
		friendRequestsReceived,
		friendRequestsSent,
	};
};

const createRandomWorkData = (dates: {
	startDate: Date;
	endDate: Date | null;
}): WorkData => {
	const { startDate, endDate } = dates;
	return {
		company: faker.company.name(),
		position: faker.person.jobTitle(),
		city: faker.location.city(),
		description: faker.lorem.paragraph(),
		startDate,
		endDate,
	};
};

const createRandomPrimaryEducationData = (dates: {
	startDate: Date;
	endDate: Date | null;
}): EducationData => {
	const { startDate, endDate } = dates;

	return {
		school: `${faker.company.name()} High School`,
		degree: getRandValueFromArray(highSchoolDegreeTypes),
		city: faker.location.city(),
		description: faker.lorem.paragraph(),
		startDate,
		endDate,
		activities: Array.from({ length: getRandomInt() }, () =>
			getRandValueFromArray(highSchoolActivities),
		),
	};
};

const createRandomSecondaryEducationData = (dates: {
	startDate: Date;
	endDate: Date | null;
}): EducationData => {
	const { startDate, endDate } = dates;

	const { field, concentrations } = getRandValueFromArray(fieldsOfStudy);
	const primaryConcentration = getRandValueFromArray(concentrations);
	const secondaryConcentrationOptions = concentrations.filter(
		(concentration: string) => concentration !== primaryConcentration,
	);

	return {
		school: `${faker.company.name()} University`,
		degree: getRandValueFromArray(universityDegreeTypes),
		fieldOfStudy: field,
		city: faker.location.city(),
		description: faker.lorem.paragraph(),
		startDate,
		endDate,
		concentration: primaryConcentration,
		secondaryConcentrations: Array.from({ length: getRandomInt(2) }, () =>
			getRandValueFromArray(secondaryConcentrationOptions),
		),
		activities: Array.from({ length: getRandomInt() }, () =>
			getRandValueFromArray(universityActivities),
		),
	};
};

const createRandomSocialLinksData = (
	firstName: string,
	lastName: string,
): SocialLinksData => {
	const { name, url } = getRandValueFromArray(socialMediaSites);

	const username = faker.internet.userName({ firstName, lastName });
	return {
		platform: name,
		username,
		url: `${url}/${convertToSlug(username)}`,
	};
};

const createRandomUserAboutData = (
	firstName: string,
	lastName: string,
	birthday: Date,
): UserAboutData => {
	const { lifeEvents, yearsStartJob, yearsGraduateSchool, placesLived } =
		getLifeEvents(birthday);
	return {
		work: Array.from({ length: yearsStartJob.length }, (_, i) =>
			createRandomWorkData(yearsStartJob[i]),
		),
		education: Array.from({ length: yearsGraduateSchool.length }, (_, i) =>
			i === 0
				? createRandomPrimaryEducationData(yearsGraduateSchool[i])
				: createRandomSecondaryEducationData(yearsGraduateSchool[i]),
		),
		placesLived,
		website: faker.internet.domainName(),
		socialLinks: Array.from({ length: getRandomInt() }, () =>
			createRandomSocialLinksData(firstName, lastName),
		),
		aboutYou: faker.lorem.paragraph(),
		nicknames: Array.from({ length: getRandomInt(3) }, () =>
			faker.internet.userName(),
		),
		lifeEvents,
	};
};
interface Options
	extends Partial<UserSystemData>,
		Partial<UserActivityData>,
		Partial<UserAboutData> {
	posts?: IPost[];
	noFriends?: boolean;
	noSavedPosts?: boolean;
}

export const createRandomUser = async ({
	userType = "user",
	isDeleted = false,
	deletedData,
	validUntil,
	refreshTokens = [],
	friends = [],
	savedPosts = [],
	friendRequestsReceived = [],
	friendRequestsSent = [],
}: Options = {}) => {
	const basicInfo = createRandomBasicInfo();
	const { firstName, lastName, birthday } = basicInfo;

	const userData = {
		...basicInfo,
		...createRandomUserAboutData(firstName, lastName, birthday),
		...createRandomSystemData({
			userType,
			isDeleted,
			deletedData,
			validUntil,
			refreshTokens,
		}),
		...createRandomActivityData({
			friends,
			savedPosts,
			friendRequestsReceived,
			friendRequestsSent,
		}),
	};

	const user = new User(userData);
	const newUser = await user.save();

	return newUser;
};

export const addFriendsToUser = async (user: IUser, users: IUser[]) => {
	const numValues = getRandomInt(users.length) || 2;
	const friendsToAdd: ObjectId[] = getRandValuesFromArrayOfObjs(
		users as IUserWithId[],
		numValues,
	);

	try {
		for (const friend of friendsToAdd) {
			await User.findByIdAndUpdate(friend, {
				$addToSet: { friends: user._id },
			});
		}

		return (await User.findByIdAndUpdate(
			user._id,
			{
				$addToSet: { friends: { $each: friendsToAdd } },
			},
			{ new: true },
		)) as IUser;
	} catch (error) {
		throw new Error(error);
	}
};

export const addFriends = async (users: IUser[]) => {
	return await Promise.all(
		users.map(async (user) => (await addFriendsToUser(user, users)) as IUser),
	);
};

export const createUser = async (
	users: IUser[],
	posts: ObjectId[],
	options: Options,
) => {
	try {
		let user = (await createRandomUser(options)) as IUser;
		if (!options.noSavedPosts) user = await addSavedPostsToUser(user, posts);

		if (!options.noFriends) user = await addFriendsToUser(user, users);

		return user;
	} catch (error) {
		throw new Error(error);
	}
};

export const createUsers = async (quantity = 1, postIds?: ObjectId[]) => {
	const usersPromises: Promise<IUser>[] = [];
	for (let i = 0; i < quantity; i++) {
		usersPromises.push(createRandomUser());
	}
	const users = await Promise.all(usersPromises);

	const usersWithFriends = await addFriends(users);

	if (postIds) return await addSavedPosts(usersWithFriends, postIds);

	return usersWithFriends;
};
