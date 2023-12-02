import { faker } from "@faker-js/faker";

import {
	getRandValueFromArray,
	getRandValuesFromArray,
	getRandValuesFromArrayOfObjs,
	getRandomInt,
} from "../../utils/helperFunctions";
import { LANGUAGES } from "../../../../types/languages";
import { OTHER_NAME_TYPES } from "../../../../types/otherNames";
import { HOBBIES_BANK } from "../../../../types/hobbies";
import { VALID_SOCIAL_PLATFORMS_ARRAY } from "../../../../types/socialLinks";

const createMiscAboutData = (firstName: string, lastName: string) => {
	const bio = faker.person.bio();
	const aboutYou = faker.lorem.paragraph();

	const avatarUrl = faker.image.avatar();
	const coverPhotoUrl = faker.image.url();
	const languages = getRandValuesFromArray(LANGUAGES);
	const websites = Array.from(
		{ length: getRandomInt(3) },
		() =>
			`${faker.internet.domainName()}/${faker.internet.userName({
				firstName,
				lastName,
			})}`,
	);
	const favoriteQuotes = Array.from({ length: getRandomInt(3) }, () =>
		faker.lorem.sentence(),
	).join(", ");
	const socialLinks = Array.from({ length: getRandomInt(3) }, () => {
		const platform = getRandValueFromArray(VALID_SOCIAL_PLATFORMS_ARRAY);
		const username = faker.internet.userName({ firstName, lastName });
		return {
			platform,
			username,
		};
	});

	const otherNames = Array.from({ length: getRandomInt(2) }, () => {
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
