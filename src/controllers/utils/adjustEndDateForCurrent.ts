import { IncludesStartEndDates } from "../../../types/IUser";
import processDateValues from "./processDateValues";

type DateAdjustmentForCurrent = IncludesStartEndDates & {
	current: boolean;
};

const adjustEndDateForCurrent = <T extends DateAdjustmentForCurrent>(
	values: T,
) => {
	const processedValues = processDateValues(values);
	return processedValues.current
		? {
				...processedValues,
				endDay: undefined,
				endMonth: undefined,
				endYear: undefined,
		  }
		: { ...processedValues };
};

export default adjustEndDateForCurrent;
