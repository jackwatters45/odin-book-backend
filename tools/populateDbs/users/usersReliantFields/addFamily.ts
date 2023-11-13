import User from "../../../../src/models/user.model";
import {
	FamilyRelationshipOptions,
	femaleFamilyRelationships,
	genderNeutralFamilyRelationships,
	getReciprocalRelationship,
	maleFamilyRelationships,
} from "../../../../src/constants/FamilyMembers";
import { GenderTypesType } from "../../../../src/constants/Gender";
import { IUser } from "../../../../types/IUser";
import {
	getRandValueFromArray,
	getRandomInt,
} from "../../utils/populateHelperFunctions";

const getRelationshipBank = (gender: GenderTypesType | undefined) =>
	gender === "Male"
		? maleFamilyRelationships
		: gender === "Female"
		? femaleFamilyRelationships
		: genderNeutralFamilyRelationships;

const addFamilyMembers = async (users: IUser[]) => {
	try {
		const globalRelationships = new Map();
		const singularRelationshipTypes = new Set(["Father", "Mother"]);

		await Promise.all(
			users.map(async (user) => {
				const userSingularRelationships = new Set();
				const numberOfFamilyMembers = getRandomInt(5);

				for (let i = 0; i < numberOfFamilyMembers; i++) {
					const potentialFamilyMembers = users.filter((u) => {
						return (
							u._id !== user?._id &&
							!globalRelationships.has(`${user?._id}_${u?._id}`) &&
							!globalRelationships.has(`${u?._id}_${user?._id}`)
						);
					});

					if (potentialFamilyMembers.length === 0) break;

					const familyMember = getRandValueFromArray(potentialFamilyMembers);

					const relationshipBank = getRelationshipBank(
						familyMember?.gender?.defaultType,
					);

					let relationship;
					do {
						relationship = getRandValueFromArray(relationshipBank);
					} while (
						singularRelationshipTypes.has(relationship) &&
						userSingularRelationships.has(relationship)
					);

					userSingularRelationships.add(relationship);

					const familyMemberRecord = {
						user: familyMember?._id,
						relationship: relationship,
					};

					user.familyMembers.push(familyMemberRecord);

					const reciprocalRelationship = getReciprocalRelationship(
						relationship as keyof typeof FamilyRelationshipOptions,
						familyMember.gender,
					);

					const familyMemberRelationship = {
						user: user._id,
						relationship: reciprocalRelationship,
					};

					await User.findByIdAndUpdate(familyMember._id, {
						$addToSet: { familyMembers: familyMemberRelationship },
					});

					globalRelationships.set(`${user?._id}_${familyMember?._id}`, true);
					globalRelationships.set(`${familyMember?._id}_${user?._id}`, true);
				}

				await user.save();
			}),
		);
	} catch (error) {
		throw new Error(error);
	}
};

export default addFamilyMembers;
