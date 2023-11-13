import { faker } from "@faker-js/faker";

import {
	getRandValueFromArray,
	getRandValuesFromArray,
	getRandValuesFromArrayOfObjs,
	getRandomInt,
} from "../../utils/populateHelperFunctions";
import {
	HOBBIES_BANK,
	LANGUAGES,
	OTHER_NAME_TYPES,
	VALID_SOCIAL_PLATFORMS_ARRAY,
} from "./utils/optionBanks";

const createMiscAboutData = () => {
	const bio = faker.person.bio();
	const aboutYou = faker.lorem.paragraph();
	const avatarUrl = faker.internet.avatar();
	const coverPhotoUrl = faker.image.url();
	const languages = getRandValuesFromArray(LANGUAGES);
	const websites = Array.from({ length: getRandomInt(3) }, () =>
		faker.internet.domainName(),
	);
	const favoriteQuotes = Array.from({ length: getRandomInt(3) }, () =>
		faker.lorem.sentence(),
	).join(", ");
	const socialLinks = Array.from({ length: getRandomInt(3) }, () => {
		const platform = getRandValueFromArray(VALID_SOCIAL_PLATFORMS_ARRAY);
		const username = faker.internet.userName();
		return {
			platform,
			username,
		};
	});

	const otherNames = Array.from({ length: getRandomInt(3) }, () => {
		const type = getRandValueFromArray(OTHER_NAME_TYPES);
		const name = faker.person.firstName();
		const showAtTop = faker.datatype.boolean(0.1);
		return {
			type,
			name,
			showAtTop,
		};
	});

	const hobbies = getRandValuesFromArrayOfObjs<{
		name: string;
		emoji: string;
	}>(HOBBIES_BANK, 5, "name");

	return {
		bio,
		aboutYou,
		avatarUrl,
		coverPhotoUrl,
		languages,
		websites,
		favoriteQuotes,
		socialLinks,
		otherNames,
		hobbies,
	};
};

export default createMiscAboutData;
