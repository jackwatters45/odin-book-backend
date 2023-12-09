import { FilterQuery } from "mongoose";
import Notification, {
	INotification,
} from "../../../models/notification.model";
import { updateNotificationCount } from "./updateNotificationCount";

interface ICreateNotification {
	query: FilterQuery<INotification>;
	from: string | string[];
	date?: Date;
	includeSocket?: boolean;
}

export const createNotificationWithMultipleFrom = async ({
	query,
	from,
	date = new Date(),
	includeSocket = true,
}: ICreateNotification) => {
	const fromArray = Array.isArray(from) ? from : [from];

	const existingNotification = await Notification.exists(query);

	if (existingNotification) {
		await Notification.findOneAndUpdate(query, {
			$addToSet: { from: { $each: fromArray } },
			updatedAt: date,
		});
	} else {
		await Notification.create({
			...query,
			from: fromArray,
			updatedAt: date,
			createdAt: date || undefined,
		});
	}

	if (includeSocket) await updateNotificationCount(query.to);
};
