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
	updateUserPassword,
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
router.put("/updateUserPassword/:id", updateUserPassword);

// /updateUser/:id/basic
router.put("/updateUser/:id/basic", updateUserBasicInfo);

// TODO -> getUserActivity?
// /users/:id/posts
router.get("/:id/posts", getUserPosts);

// /users/:id/friends
router.get("/:id/friends", getUserFriends);

// @route   GET /users/:id/saved-posts
router.get("/:id/saved-posts", getUserSavedPosts);

// @route   POST /users/:id/friend-requests
router.post("/:id/friend-requests", sendFriendRequest);

// @route   DELETE /users/:id/friends/:friendId
router.delete("/:id/friends/:friendId", unfriendUser);

// @route   POST /users/:id/friend-requests/:requestId/accept
router.post("/:id/friend-requests/:requestId/accept", acceptFriendRequest);

// @route   POST /users/:id/friend-requests/:requestId/reject
router.post("/:id/friend-requests/:requestId/reject", rejectFriendRequest);

export default router;
