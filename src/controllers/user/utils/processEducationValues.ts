import { EducationData } from "../../../../types/user";
import processDateValues from "./processDateValues";

type EducationDataWithConcentrationsArr = EducationData & {
	concentrations1: string;
	concentrations2: string;
	concentrations3: string;
};

const processEducationValues = (values: EducationDataWithConcentrationsArr) => {
	const concentrationsArr = new Set([
		values.concentrations1,
		values.concentrations2,
		values.concentrations3,
	]);

	const valuesWithFormattedConcentrations = {
		...values,
		concentrations: [...concentrationsArr],
	};

	return processDateValues<EducationData>(valuesWithFormattedConcentrations);
};

export default processEducationValues;
