import { faker } from "@faker-js/faker";
import debug from "debug";

import User, { IUser } from "../../../../src/models/user.model";
import {
	getRandValueFromArray,
	getRandValueFromArrayOfObjs,
} from "../../utils/helperFunctions";
import { VALID_RELATIONSHIP_STATUSES_ARRAY } from "../../../../types/relationshipStatus";

const log = debug("log:populateUsers");

export const addRelationshipStatus = async (user: IUser) => {
	const relationshipStatuses = [...VALID_RELATIONSHIP_STATUSES_ARRAY];

	const potentialPartners = await User.find({
		_id: { $ne: user._id },
		"relationshipStatus.partner": { $exists: false },
	}).select("_id");

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

		if (potentialPartners.length === 0) return;
		const partner = getRandValueFromArrayOfObjs(potentialPartners);

		const relationshipStart = faker.date.between({
			from: userEighteenthBirthday,
			to: new Date(),
		});

		log("partner", partner);
		user.relationshipStatus = {
			status,
			user: partner,
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
};

// export const addRelationshipStatuses = async (users: IUser[]) => {
// 	if (users.length < 2) return;
// 	const relationshipStatuses = [...VALID_RELATIONSHIP_STATUSES_ARRAY];

// 	const alreadyPairedUsers = new Set();

// 	try {
// 		await Promise.all(
// 			users.map(async (user) => {
// 				if (alreadyPairedUsers.has(user._id)) return;

// 				const status = getRandValueFromArray(relationshipStatuses);

// 				if (status === "single") {
// 					user.relationshipStatus = {
// 						status,
// 						startDay: undefined,
// 						startMonth: undefined,
// 						startYear: undefined,
// 					};
// 					await user.save();
// 				} else {
// 					const userEighteenthBirthday = new Date(
// 						user.birthday.getFullYear() + 18,
// 						user.birthday.getMonth(),
// 						user.birthday.getDate(),
// 					);

// 					if (userEighteenthBirthday > new Date()) return;

// 					const potentialPartners = users.filter(
// 						(u) =>
// 							!alreadyPairedUsers.has(u._id) ||
// 							user.familyMembers.map((fm) => fm.user).includes(u._id),
// 					);

// 					if (potentialPartners.length === 0) return;
// 					const partner = getRandValueFromArray(potentialPartners);

// 					alreadyPairedUsers.add(user._id);
// 					alreadyPairedUsers.add(partner._id);

// 					const relationshipStart = faker.date.between({
// 						from: userEighteenthBirthday,
// 						to: new Date(),
// 					});

// 					user.relationshipStatus = {
// 						status,
// 						user: partner._id,
// 						startDay: relationshipStart.getDate().toString(),
// 						startMonth: (relationshipStart.getMonth() + 1).toString(),
// 						startYear: relationshipStart.getFullYear().toString(),
// 					};

// 					const partnerRelationshipStatus = {
// 						status,
// 						user: user._id,
// 						startDay: relationshipStart.getDate().toString(),
// 						startMonth: (relationshipStart.getMonth() + 1).toString(),
// 						startYear: relationshipStart.getFullYear().toString(),
// 					};

// 					await user.save();

// 					await User.findByIdAndUpdate(partner._id, {
// 						relationshipStatus: partnerRelationshipStatus,
// 					});
// 				}
// 			}),
// 		);
// 	} catch (error) {
// 		throw new Error(error);
// 	}
// };

// Function to handle relationship status for one user
const handleRelationshipForUser = async (
	user: IUser,
	users: IUser[],
	alreadyPairedUsers: Set<string>,
	relationshipStatuses: typeof VALID_RELATIONSHIP_STATUSES_ARRAY,
): Promise<void> => {
	if (alreadyPairedUsers.has(user._id.toString())) return;

	const status = getRandValueFromArray(relationshipStatuses);

	if (status === "single") {
		user.relationshipStatus = {
			status,
			startDay: undefined,
			startMonth: undefined,
			startYear: undefined,
		};
		try {
			await user.save();
		} catch (err) {
			console.log(err);
		}
	} else {
		const userEighteenthBirthday = new Date(
			user.birthday.getFullYear() + 18,
			user.birthday.getMonth(),
			user.birthday.getDate(),
		);
		if (userEighteenthBirthday > new Date()) return;

		const potentialPartners = users.filter(
			(u) =>
				!alreadyPairedUsers.has(u._id.toString()) &&
				!user.familyMembers.map((fm) => fm.user).includes(u._id),
		);
		if (potentialPartners.length === 0) return;
		const partner = getRandValueFromArray(potentialPartners);

		alreadyPairedUsers.add(user._id.toString());
		alreadyPairedUsers.add(partner._id.toString());

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

		try {
			await user.save();
			await User.findByIdAndUpdate(partner._id, {
				relationshipStatus: {
					status,
					user: user._id,
					startDay: relationshipStart.getDate().toString(),
					startMonth: (relationshipStart.getMonth() + 1).toString(),
					startYear: relationshipStart.getFullYear().toString(),
				},
			});
		} catch (err) {
			console.log(err);
		}
	}
};

export default handleRelationshipForUser;

export const addRelationshipStatuses = async (users: IUser[]) => {
	if (users.length < 2) return;
	const alreadyPairedUsers = new Set<string>();

	const relationshipStatuses = [...VALID_RELATIONSHIP_STATUSES_ARRAY] as const;

	const userUpdates = users.map((user) =>
		handleRelationshipForUser(
			user,
			users,
			alreadyPairedUsers,
			relationshipStatuses,
		),
	);

	try {
		await Promise.all(userUpdates);
	} catch (error) {
		throw new Error(error.message);
	}
};
