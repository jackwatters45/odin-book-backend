import { faker } from "@faker-js/faker";

import { IUser, IntroData } from "../../../../types/user";
import getRandAudienceSetting from "../../utils/getRandAudienceSetting";

const createIntro = (user: IUser): IntroData => {
	const work = user.work.reduce((acc, { _id }) => {
		return { ...acc, [String(_id)]: faker.datatype.boolean() };
	}, {});

	const education = user.education.reduce((acc, { _id }) => {
		return { ...acc, [String(_id)]: faker.datatype.boolean() };
	}, {});

	return {
		pronouns: { pronouns: faker.datatype.boolean() },
		work,
		education,
		currentCity: { currentCity: faker.datatype.boolean() },
		hometown: { hometown: faker.datatype.boolean() },
		relationshipStatus: { relationshipStatus: faker.datatype.boolean() },
		namePronunciation: { namePronunciation: faker.datatype.boolean() },
		joined: { joined: faker.datatype.boolean() },
		websites: { websites: getRandAudienceSetting() },
		socialLinks: { socialLinks: getRandAudienceSetting() },
	};
};

export default createIntro;
