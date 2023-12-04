import { faker } from "@faker-js/faker";

import getRandAudienceSetting from "../../utils/getRandAudienceSetting";
import { IUser } from "../../../../src/models/user.model";
import { IIntro as IIntro } from "../../../../types/intro";

const createIntro = (user: IUser): IIntro => {
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
