import { FilterQuery } from "mongoose";

import Notification, {
	INotification,
} from "../../../models/notification.model";
import { updateNotificationCount } from "./updateNotificationCount";

interface IRemoveNotification {
	query: FilterQuery<INotification>;
	remove: string;
}

export const removeUserFromNotificationMultipleFrom = async ({
	query,
	remove,
}: IRemoveNotification) => {
	await Notification.updateOne(query, {
		$pull: { from: remove },
	});

	await updateNotificationCount(query.to as string);
};
