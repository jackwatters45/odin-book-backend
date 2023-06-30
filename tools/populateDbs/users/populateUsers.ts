import { faker } from "@faker-js/faker";
import User, {
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
import debug from "debug";
import {
	convertToSlug,
	getRandValueFromArray,
	getRandValuesFromArrayObjs,
	getRandomInt,
} from "../utils/populateHelperFunctions";

const log = debug("log");

const createRandomBasicInfo = () => {
	const firstName = faker.person.firstName();
	const lastName = faker.person.lastName();
	const email = faker.helpers.unique(faker.internet.email, [
		firstName,
		lastName,
	]);
	const username = faker.helpers.unique(faker.internet.userName, [
		firstName,
		lastName,
	]);
	const password = faker.internet.password(10);
	const avatarUrl = faker.internet.avatar();
	const description = faker.person.bio();
	const phoneNumber = faker.phone.number();

	return {
		firstName,
		lastName,
		email,
		username,
		password,
		avatarUrl,
		description,
		phoneNumber,
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

const createRandomUser = async ({
	userType = "user",
	isDeleted = false,
	deletedData,
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
		...createRandomSystemData({ userType, isDeleted, deletedData }),
		...createRandomActivityData({
			friends,
			savedPosts,
			friendRequestsReceived,
			friendRequestsSent,
		}),
	};

	const user = new User(userData);
	const newUser = await user.save();

	const users = await User.find({ _id: { $ne: newUser._id } }).select("_id");

	const friendsToAdd = getRandValuesFromArrayObjs(
		users,
		getRandomInt(users.length),
	);

	newUser.friends = friendsToAdd;

	const updatedUser = await newUser.save();

	for (const friend of friends) {
		const friendDoc = await User.findById(friend);
		if (!friendDoc) throw new Error("Friend not found");
		friendDoc.friends.push(updatedUser._id);
		await friendDoc.save();
	}

	log(updatedUser);
};

export const createUsers = async (quantity = 1) => {
	for (let i = 0; i < quantity; i++) {
		await createRandomUser();
	}
};
