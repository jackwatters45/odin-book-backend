export const calculateStartTime = (timeRange: string): Date => {
	let start;
	switch (timeRange) {
		case "lastYear":
			start = new Date();
			start.setFullYear(start.getFullYear() - 1);
			break;
		case "lastMonth":
			start = new Date();
			start.setMonth(start.getMonth() - 1);
			break;
		case "lastWeek":
			start = new Date();
			start.setDate(start.getDate() - 7);
			break;
		case "today":
			start = new Date();
			start.setHours(0, 0, 0, 0);
			break;
		default:
			start = new Date(0);
	}
	return start;
};
