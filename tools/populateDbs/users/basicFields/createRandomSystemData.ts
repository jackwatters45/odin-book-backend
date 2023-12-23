import { faker } from "@faker-js/faker";

import { UserSystemData } from "../../../../types/user";

const createRandomSystemData = ({
	userType = "guest",
	isDeleted = false,
	deletedData = undefined,
	refreshTokens = [],
}: Partial<UserSystemData>) => {
	const pastDate = faker.date.past({ years: 3 });
	return {
		userType,
		isDeleted,
		deletedData,
		refreshTokens,
		createdAt: pastDate,
		updatedAt: pastDate,
	};
};

export default createRandomSystemData;
