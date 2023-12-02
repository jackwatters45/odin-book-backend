import defaultCommentPopulation from "../../comment/utils/defaultCommentPopulation";

const defaultPostPopulation = [
	{ path: "author", select: "fullName avatarUrl" },
	{ path: "taggedUsers", select: "fullName avatarUrl" },
	{ path: "to", select: "fullName" },
	{
		path: "sharedFrom",
		populate: [
			{
				path: "author",
				select: "fullName avatarUrl",
			},
			{
				path: "taggedUsers",
				select: "fullName avatarUrl",
			},
		],
		select: "-sharedFrom",
	},
	{
		path: "reactions",
		populate: {
			path: "user",
			select: "fullName isDeleted avatarUrl",
		},
	},
	{
		path: "comments",
		populate: defaultCommentPopulation,
	},
];

export default defaultPostPopulation;
