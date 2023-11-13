import {faker} from "@faker-js/faker";

import { UserSystemData } from "../../../../types/IUser";

const createRandomSystemData = ({
	userType = "user",
	isDeleted = false,
	deletedData = undefined,
	refreshTokens = [],
}: Partial<UserSystemData>) => {
	const pastDate = faker.date.past();
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