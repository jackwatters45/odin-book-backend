import { faker } from "@faker-js/faker";

const getDateForInteraction = (createdAt: Date) => {
	const soonDate = faker.date.soon({
		days: 14,
		refDate: new Date(createdAt),
	});

	let to: Date;
	to = soonDate > new Date() ? faker.date.recent() : soonDate;
	if (to < createdAt) to = new Date();

	return faker.date.between({
		from: new Date(createdAt),
		to,
	});
};

export default getDateForInteraction;
