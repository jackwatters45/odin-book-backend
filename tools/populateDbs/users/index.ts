import { faker } from "@faker-js/faker";
import debug from "debug";

import User, { IUser } from "../../../src/models/user.model";
import createEducation from "./basicFields/createEducation";
import createIntro from "./userReliantFields/createIntro";
import createAudienceSettings from "./userReliantFields/createAudienceSettings";
import createMiscAboutData from "./basicFields/createMiscAboutData";
import createPlacesLivedData from "./basicFields/createPlacesLivedData";
import createWorkHistory from "./basicFields/createWorkHistory";
import createRandomSystemData from "./basicFields/createRandomSystemData";
import createRandomBasicAndLoginInfo from "./basicFields/createRandomBasicAndLoginInfo";

const log = debug("log:populateUsers");

export const getUserData = () => {
	const birthday = faker.date.birthdate({
		min: 14,
		max: 65,
		mode: "age",
	});

	const basicInfo = createRandomBasicAndLoginInfo(birthday);
	const systemData = createRandomSystemData({});
	const miscAboutData = createMiscAboutData(
		basicInfo.firstName,
		basicInfo.lastName,
	);
	const education = createEducation(birthday);
	const workHistory = createWorkHistory(birthday);
	const placesLived = createPlacesLivedData(birthday);

	return {
		...basicInfo,
		...systemData,
		...miscAboutData,
		...education,
		...workHistory,
		...placesLived,
	};
};

export const createRandomUser = async () => {
	const userData = getUserData();

	const user = await User.create(userData);

	user.audienceSettings = createAudienceSettings(user);
	user.intro = createIntro(user);

	await user.save();

	return user;
};

export const populateUsers = async (quantity = 1) => {
	log("Populating users...");
	const usersPromises: Promise<IUser>[] = [];
	for (let i = 0; i < quantity; i++) {
		usersPromises.push(createRandomUser());
	}

	log("Users have been populated successfully");

	await Promise.all(usersPromises);
};
