import express from "express";
import {
	acceptFriendRequest,
	createUser,
	getDeletedUserById,
	getUserById,
	getUserFriends,
	getUserPosts,
	getUserSavedPosts,
	getUsers,
	rejectFriendRequest,
	sendFriendRequest,
	unfriendUser,
	updateUserBasicInfo,
	updateUserCoverPhoto,
	updateUserPassword,
	updateUserProfilePhoto,
} from "../controllers/user.controller";

const router = express.Router();

// /users/
router.get("/", getUsers);

// /users/:id
router.get("/:id", getUserById);

// /users/:id/deleted
router.get("/:id/deleted", getDeletedUserById);

// /users
router.post("/", createUser);

// /updateUserPassword/:id
router.patch("/updateUser/:id/password", updateUserPassword);

// /updateUser/:id/profile-photo
router.patch("/updateUser/:id/profile-photo", updateUserProfilePhoto);

// /updateUser/:id/cover-photo
router.patch("/updateUser/:id/cover-photo", updateUserCoverPhoto);

// /updateUser/:id/basic
router.patch("/updateUser/:id/basic", updateUserBasicInfo);

// TODO -> getUserActivity?
// /users/:id/posts
router.get("/:id/posts", getUserPosts);

// /users/:id/friends
router.get("/:id/friends", getUserFriends);

// @route   GET /users/:id/saved-posts
router.get("/:id/saved-posts", getUserSavedPosts);

// @route   POST /users/:id/friend-requests
router.post("/me/friend-requests/:id", sendFriendRequest);

// @route   DELETE /users/me/friends/:friendId
router.delete("/me/friends/:friendId", unfriendUser);

// @route   POST /users/me/friend-requests/:requestId/accept
router.post("/me/friend-requests/:requestId/accept", acceptFriendRequest);

// @route   POST /users/me/friend-requests/:requestId/reject
router.post("/me/friend-requests/:requestId/reject", rejectFriendRequest);

export default router;
