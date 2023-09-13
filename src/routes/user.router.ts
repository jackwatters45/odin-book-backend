import express from "express";
import {
	acceptFriendRequest,
	createUser,
	getDeletedUserById,
	getUserById,
	getUserFriends,
	getUserPhotos,
	getUserPosts,
	getUserSavedPosts,
	getUsers,
	rejectFriendRequest,
	sendFriendRequest,
	unfriendUser,
	updateUserBasicInfo,
	updateUserBio,
	updateUserCoverPhoto,
	updateUserHobbies,
	updateUserIntro,
	updateUserPassword,
	updateUserProfilePhoto,
} from "../controllers/user.controller";

const router = express.Router();

// /users/
router.get("/", getUsers);

// /users/:id
router.get("/:id", getUserById);

// /users/:id/photos
router.get("/:id/photos", getUserPhotos);

// /users/:id/deleted
router.get("/:id/deleted", getDeletedUserById);

// /users
router.post("/", createUser);

// /updateUserPassword/:id
router.patch("/:id/password", updateUserPassword);

// /:id/profile-photo
router.patch("/:id/profile-photo", updateUserProfilePhoto);

// /:id/cover-photo
router.patch("/:id/cover-photo", updateUserCoverPhoto);

// /:id/bio
router.patch("/:id/bio", updateUserBio);

// /:id/hobbies
router.patch("/:id/hobbies", updateUserHobbies);

// /:id/intro
router.patch("/:id/intro", updateUserIntro);

// /:id/basic
router.patch("/:id/basic", updateUserBasicInfo);

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
