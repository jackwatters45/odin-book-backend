import { faker } from "@faker-js/faker";
import User, {
	IUser,
	UserActivityData,
	UserSystemData,
} from "../../../src/models/user-model/user.model";
import {
	EducationData,
	SocialLinksData,
	UserAboutData,
	WorkData,
} from "../../../src/models/user-model/user-about.model";
import {
	universityDegreeTypes,
	fieldsOfStudy,
	socialMediaSites,
	highSchoolDegreeTypes,
	highSchoolActivities,
	universityActivities,
} from "./utils/userOptions";
import { getLifeEvents } from "./utils/life-events";
import {
	convertToSlug,
	getRandValueFromArray,
	getRandValuesFromArrayObjs,
	getRandomInt,
} from "../utils/populateHelperFunctions";

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
	const phoneNumber = faker.phone.number();
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
): UserAboutData => {
	const {
		birthDate,
		lifeEvents,
		yearsStartJob,
		yearsGraduateSchool,
		placesLived,
	} = getLifeEvents();
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
		birthDate,
	};
};
interface Options
	extends Partial<UserSystemData>,
		Partial<UserActivityData>,
		Partial<UserAboutData> {}

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
	const { firstName, lastName } = basicInfo;
	const userData = {
		...basicInfo,
		...createRandomUserAboutData(firstName, lastName),
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

export const addFriends = async (users: IUser[]) => {
	for (const user of users) {
		if (!user) continue;

		const friendsToAdd = getRandValuesFromArrayObjs(
			users.filter((u) => u._id.toString() !== user._id.toString()),
			getRandomInt(users.length),
		);

		await User.findByIdAndUpdate(user._id, {
			$push: { friends: { $each: friendsToAdd.map((friend) => friend._id) } },
		});

		for (const friend of friendsToAdd) {
			await User.findByIdAndUpdate(friend._id, {
				$push: { friends: user._id },
			});
		}
	}

	const updatedUsers = await User.find({
		_id: { $in: users.map((user) => user._id) },
	});

	return updatedUsers;
};

export const createUsers = async (quantity = 1) => {
	const users: IUser[] = [];
	for (let i = 0; i < quantity; i++) {
		const user = await createRandomUser();
		if (!user) return;
		users.push(user);
	}

	const usersWithFriends = await addFriends(users);

	return usersWithFriends;
};
