import { AudienceStatusMultiple, IUser } from "../../../../types/user";
import getRandAudienceSetting from "../../utils/getRandAudienceSetting";

const getAudienceSettingArr = <T>(
	arr: T[],
	field?: keyof T,
): AudienceStatusMultiple =>
	arr.reduce((acc, item) => {
		const key = field ? String(item[field]) : String(item);
		return { ...acc, [key]: getRandAudienceSetting() };
	}, {});

const createAudienceSettings = (user: IUser) => {
	return {
		currentCity: getRandAudienceSetting(),
		hometown: getRandAudienceSetting(),
		relationshipStatus: getRandAudienceSetting(),
		phoneNumber: getRandAudienceSetting(),
		email: getRandAudienceSetting(),
		gender: getRandAudienceSetting(),
		pronouns: getRandAudienceSetting(),
		birthday: getRandAudienceSetting(),
		languages: getRandAudienceSetting(),
		aboutYou: getRandAudienceSetting(),
		namePronunciation: getRandAudienceSetting(),
		favoriteQuotes: getRandAudienceSetting(),

		otherNames: getAudienceSettingArr(user.otherNames, "_id"),
		familyMembers: getAudienceSettingArr(user.familyMembers, "_id"),
		socialLinks: getAudienceSettingArr(user.socialLinks, "_id"),
		websites: getAudienceSettingArr(user.websites),
		work: getAudienceSettingArr(user.work, "_id"),
		education: getAudienceSettingArr(user.education, "_id"),
		placesLived: getAudienceSettingArr(user.placesLived, "_id"),
	};
};

export default createAudienceSettings;
