import { faker } from "@faker-js/faker";

import { PlaceLivedData } from "../../../../types/user";
import { getRandomInt } from "../../utils/helperFunctions";

const createPlaceLived = (
	type: "hometown" | "current" | "default",
	from?: Date,
): Partial<PlaceLivedData> => {
	const isValidFromDate = from && !isNaN(from.getTime()) && from < new Date();

	const validFromDate = isValidFromDate ? from : faker.date.past();

	return {
		type,
		city: faker.location.city(),
		state: faker.location.state(),
		country: faker.location.country(),
		startDay: from ? faker.date.past().getDate().toString() : undefined,
		startMonth: from ? faker.date.past().getMonth().toString() : undefined,
		startYear: from
			? faker.date
					.between({ from: validFromDate, to: new Date() })
					.getFullYear()
					.toString()
			: undefined,
	};
};

const createPlacesLivedData = (
	birthday: Date,
): Record<"placesLived", Partial<PlaceLivedData>[]> => {
	const hometown = createPlaceLived("hometown", birthday);
	const otherPlacesLived = Array.from({ length: getRandomInt(5) }, () =>
		createPlaceLived(
			"default",
			new Date(
				hometown.startYear
					? parseInt(hometown.startYear) + 1
					: birthday.getFullYear(),
				faker.date.past().getMonth(),
				faker.date.past().getDate(),
			),
		),
	).sort((a, b) => {
		if (a.startYear && b.startYear) {
			return parseInt(a.startYear) - parseInt(b.startYear);
		} else if (a.startYear) {
			return -1;
		} else if (b.startYear) {
			return 1;
		} else {
			return 0;
		}
	});

	const current = createPlaceLived(
		"current",
		new Date(
			otherPlacesLived?.[0].startYear
				? parseInt(otherPlacesLived[0].startYear) + 1
				: birthday.getFullYear(),
			faker.date.past().getMonth(),
			faker.date.past().getDate(),
		),
	);

	const placesLived = [hometown, ...otherPlacesLived, current];

	return { placesLived };
};

export default createPlacesLivedData;
