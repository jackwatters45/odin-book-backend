import { faker } from "@faker-js/faker";

import { PlaceLivedData } from "../../../../types/IUser";
import { getRandomInt } from "../../utils/populateHelperFunctions";

const createPlaceLived = (
	type: "hometown" | "current" | "default",
	birthDay?: Date,
): Partial<PlaceLivedData> => {
	return {
		type,
		city: faker.location.city(),
		state: faker.location.state(),
		country: faker.location.country(),
		startDay: birthDay ? faker.date.past().getDate().toString() : undefined,
		startMonth: birthDay ? faker.date.past().getMonth().toString() : undefined,
		startYear: birthDay
			? faker.date
					.between({ from: birthDay, to: new Date() })
					.getFullYear()
					.toString()
			: undefined,
	};
};

const createPlacesLivedData = (
	birthday: Date,
): Record<"placesLived", Partial<PlaceLivedData>[]> => {
	const otherPlacesLived = Array.from({ length: getRandomInt(5) }, () =>
		createPlaceLived("default", birthday),
	);

	const placesLived = [
		createPlaceLived("hometown", birthday),
		createPlaceLived("current", birthday),
		...otherPlacesLived,
	];

	return { placesLived };
};

export default createPlacesLivedData;
