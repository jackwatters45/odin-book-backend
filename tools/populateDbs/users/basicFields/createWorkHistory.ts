import { faker } from "@faker-js/faker";

import { getRandomInt } from "../../utils/helperFunctions";
import { IWork } from "../../../../types/work";

const createRandomWorkData = (data: Partial<IWork>): Partial<IWork> => {
	return {
		company: data.company || faker.company.name(),
		position: data.position || faker.person.jobTitle(),
		current: data.current || faker.datatype.boolean(0.25),
		city: data.city || faker.location.city(),
		description: data.description || faker.lorem.paragraph(),
		startDay: data.startDay || faker.date.past().getDate().toString(),
		startMonth: data.startMonth || faker.date.past().getMonth().toString(),
		startYear: data.startYear || faker.date.past().getFullYear().toString(),
		endDay: data.endDay || faker.date.past().getDate().toString(),
		endMonth: data.endMonth || faker.date.past().getMonth().toString(),
		endYear: data.endYear || faker.date.past().getFullYear().toString(),
	};
};

const createWorkHistory = (
	birthday: Date,
): Record<"work", Partial<IWork>[]> => {
	const numJobs = getRandomInt(5);

	if (new Date(birthday.getFullYear() + 18, 0, 1) > new Date())
		return { work: [] };

	const workHistory: Partial<IWork>[] = [];
	for (let i = 0; i < numJobs; i++) {
		const startYear = faker.date
			.between({
				from: new Date(birthday.getFullYear() + 18, 0, 1),
				to: new Date(),
			})
			.getFullYear()
			.toString();
		workHistory.push(createRandomWorkData({ startYear }));
	}

	const work = workHistory.sort((a, b) => {
		if (a.startYear && b.startYear) {
			return Number(b.startYear) - Number(a.startYear);
		}
		return 0;
	});

	return { work };
};

export default createWorkHistory;
