import { ObjectId } from "mongoose";
import { UserPreviewWithFriendLists } from "../../../../types/user";
import { UserStatusType } from "../../../../types/userStatus";

const getUserStatus = (
	user: UserPreviewWithFriendLists,
	reqUser: UserPreviewWithFriendLists,
	userFriendsIds: ObjectId[],
): UserStatusType => {
	if (!user._id) return "non-friend";

	const isFriend = userFriendsIds.includes(user._id);

	const requestSent = reqUser.friendRequestsSent.includes(user._id);
	const requestReceived = reqUser.friendRequestsReceived.includes(user._id);

	return isFriend
		? "friend"
		: requestSent
		? "request sent"
		: requestReceived
		? "request received"
		: "non-friend";
};

export default getUserStatus;
