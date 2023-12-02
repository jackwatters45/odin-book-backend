export interface IncludesStartDates {
	startYear: string | undefined;
	startMonth: string | undefined;
	startDay: string | undefined;
}

export interface IncludesEndDates {
	endYear: string | undefined;
	endMonth: string | undefined;
	endDay: string | undefined;
}

export type IncludesStartEndDates = IncludesStartDates & IncludesEndDates;
