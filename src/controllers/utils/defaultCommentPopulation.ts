const defaultCommentPopulation = [
	{
		path: "author",
		select: "fullName isDeleted avatarUrl",
	},
	{
		path: "reactions",
		populate: {
			path: "user",
			select: "fullName isDeleted avatarUrl",
		},
	},
];

export default defaultCommentPopulation;
