import debug from "debug";

import User from "../../../../src/models/user.model";
import {
	FAMILY_RELATIONSHIPS,
	FEMALE_FAMILY_RELATIONSHIPS,
	GENDER_NEUTRAL_FAMILY_RELATIONSHIPS,
	getReciprocalRelationship,
	MALE_FAMILY_RELATIONSHIPS,
} from "../../../../types/familyMembers";
import { GenderTypesType } from "../../../../types/gender";
import { IUser } from "../../../../types/user";
import {
	getRandValueFromArray,
	getRandomInt,
} from "../../utils/helperFunctions";

const log = debug("log:populateUsers");

export const AddFamilyMembersToUser = async (user: IUser) => {
	const singularRelationshipTypes = new Set<string>(["Father", "Mother"]);

	const users: IUser[] = await User.find({ _id: { $ne: user._id } })
		.select("_id")
		.lean();

	const userSingularRelationships = new Set<string>();
	const numberOfFamilyMembers = getRandomInt(6);

	const familyMemberUpdates: Promise<unknown>[] = []; // Batch updates

	for (let i = 0; i < numberOfFamilyMembers; i++) {
		const potentialFamilyMembers = users.filter(
			(u) => !userSingularRelationships.has(u._id.toString()),
		);

		if (potentialFamilyMembers.length === 0) break;

		const familyMember: IUser = getRandValueFromArray(potentialFamilyMembers);

		const relationshipBank: string[] = getRelationshipBank(
			familyMember.gender?.defaultType,
		);

		let relationship: string;
		do {
			relationship = getRandValueFromArray(relationshipBank);
		} while (
			singularRelationshipTypes.has(relationship) &&
			userSingularRelationships.has(relationship) &&
			!relationship
		);

		userSingularRelationships.add(relationship);

		const familyMemberRecord = {
			user: familyMember._id,
			relationship,
		};

		user.familyMembers.push(familyMemberRecord);

		const reciprocalRelationship = getReciprocalRelationship(
			relationship as keyof typeof FAMILY_RELATIONSHIPS,
			familyMember.gender,
		);

		const familyMemberRelationship = {
			user: user._id,
			relationship: reciprocalRelationship,
		};

		// Queue update operations for batch execution
		familyMemberUpdates.push(
			User.findByIdAndUpdate(familyMember._id, {
				$addToSet: { familyMembers: familyMemberRelationship },
			}),
		);
	}

	// Execute all update operations in a batch
	await Promise.all(familyMemberUpdates);

	log(`Added ${user.familyMembers.length} family members to user ${user._id}`);

	await user.save();
};

export const getRelationshipBank = (gender: GenderTypesType | undefined) =>
	gender === "Male"
		? MALE_FAMILY_RELATIONSHIPS
		: gender === "Female"
		? FEMALE_FAMILY_RELATIONSHIPS
		: GENDER_NEUTRAL_FAMILY_RELATIONSHIPS;

const addFamilyMembers = async (users: IUser[]) => {
	try {
		await Promise.all(users.map(AddFamilyMembersToUser));
	} catch (error) {
		throw new Error(error);
	}
};

export default addFamilyMembers;
