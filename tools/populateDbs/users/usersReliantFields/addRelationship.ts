import { faker } from "@faker-js/faker";

import User from "../../../../src/models/user.model";
import { VALID_RELATIONSHIP_STATUSES_ARRAY } from "../../../../src/constants";
import { IUser } from "../../../../types/IUser";
import { getRandValueFromArray } from "../../utils/populateHelperFunctions";

const addRelationshipStatus = async (users: IUser[]) => {
	const relationshipStatuses = [...VALID_RELATIONSHIP_STATUSES_ARRAY];

	const alreadyPairedUsers = new Set();

	try {
		await Promise.all(
			users.map(async (user) => {
				if (alreadyPairedUsers.has(user._id)) return;

				const status = getRandValueFromArray(relationshipStatuses);

				if (status === "single") {
					user.relationshipStatus = {
						status,
						startDay: undefined,
						startMonth: undefined,
						startYear: undefined,
					};
					await user.save();
				} else {
					const userEighteenthBirthday = new Date(
						user.birthday.getFullYear() + 18,
						user.birthday.getMonth(),
						user.birthday.getDate(),
					);

					if (userEighteenthBirthday > new Date()) return;

					const potentialPartners = users.filter(
						(u) => !alreadyPairedUsers.has(u._id),
					);

					if (potentialPartners.length === 0) return;
					const partner = getRandValueFromArray(potentialPartners);

					alreadyPairedUsers.add(user._id);
					alreadyPairedUsers.add(partner._id);

					const relationshipStart = faker.date.between({
						from: userEighteenthBirthday,
						to: new Date(),
					});

					user.relationshipStatus = {
						status,
						user: partner._id,
						startDay: relationshipStart.getDate().toString(),
						startMonth: (relationshipStart.getMonth() + 1).toString(),
						startYear: relationshipStart.getFullYear().toString(),
					};

					const partnerRelationshipStatus = {
						status,
						user: user._id,
						startDay: relationshipStart.getDate().toString(),
						startMonth: (relationshipStart.getMonth() + 1).toString(),
						startYear: relationshipStart.getFullYear().toString(),
					};

					await user.save();

					await User.findByIdAndUpdate(partner._id, {
						relationshipStatus: partnerRelationshipStatus,
					});
				}
			}),
		);
	} catch (error) {
		throw new Error(error);
	}
};

export default addRelationshipStatus;
