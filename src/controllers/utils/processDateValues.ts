import { IncludesStartDates } from "../../../types/IUser";

type DateValues = IncludesStartDates & {
	endYear?: string;
	endMonth?: string;
	endDay?: string;
};

const processDateValues = <T extends DateValues>(values: T) => {
	const updatedValues = { ...values };

	if (!updatedValues.startYear) {
		updatedValues.startMonth = undefined;
		updatedValues.startDay = undefined;
	} else if (!updatedValues.startMonth || updatedValues.startMonth === "0") {
		updatedValues.startDay = undefined;
	}

	if (!updatedValues.endYear) {
		updatedValues.endMonth = undefined;
		updatedValues.endDay = undefined;
	} else if (!updatedValues.endMonth || updatedValues.endMonth === "0") {
		updatedValues.endDay = undefined;
	}

	return updatedValues;
};

export default processDateValues;
