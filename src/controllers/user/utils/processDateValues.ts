import { IncludesStartDates } from "../../../../types/includesStartEndDates";

type DateValues = IncludesStartDates & {
	endYear?: string;
	endMonth?: string;
	endDay?: string;
};

const processDateValues = <T extends DateValues>(values: T) => {
	if (!values.startYear) {
		values.startMonth = undefined;
		values.startDay = undefined;
	} else if (!values.startMonth || values.startMonth === "0") {
		values.startDay = undefined;
	}

	if (!values.endYear) {
		values.endMonth = undefined;
		values.endDay = undefined;
	} else if (!values.endMonth || values.endMonth === "0") {
		values.endDay = undefined;
	}

	return values;
};

export default processDateValues;
