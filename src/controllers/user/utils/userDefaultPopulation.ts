// all user about routes use this projection
export const userDefaultPopulation = [
	{
		path: "familyMembers.user",
		select: "avatarUrl fullName",
	},
	{
		path: "relationshipStatus.user",
		select: "avatarUrl fullName",
	},
];
