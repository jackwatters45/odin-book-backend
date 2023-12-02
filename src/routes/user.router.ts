import express from "express";
import {
	acceptFriendRequest,
	createUser,
	getDeletedUserById,
	getUserById,
	getUserFriends,
	getUserSavedPosts,
	getUsers,
	rejectFriendRequest,
	sendFriendRequest,
	unfriendUser,
	updateUserAudienceSettings,
	updateUserBio,
	updateUserCoverPhoto,
	updateUserHobbies,
	updateUserIntro,
	updateUserPassword,
	updateUserAvatarUrl,
	updateUserPhoneNumber,
	deleteUserPhoneNumber,
	updateUserWork,
	deleteUserWork,
	updateUserEducation,
	deleteUserEducation,
	updateUserPlacesLived,
	deleteUserPlacesLived,
	createUserWork,
	createUserEducation,
	createUserPlacesLived,
	updateUserEmail,
	updateUserWebsites,
	createUserWebsites,
	deleteUserWebsites,
	createUserSocialLinks,
	updateUserSocialLinks,
	deleteUserSocialLinks,
	updateUserGender,
	deleteUserGender,
	updateUserPronouns,
	deleteUserPronouns,
	updateUserBirthday,
	updateUserLanguages,
	deleteUserLanguages,
	updateUserFamilyMembers,
	deleteUserFamilyMembers,
	createUserFamilyMembers,
	searchUserFriendsByName,
	searchUserFriendsExcludingFamily,
	updateUserRelationshipStatus,
	updateUserAboutYou,
	deleteUserAboutYou,
	deleteUserNamePronunciation,
	updateUserNamePronunciation,
	deleteUserFavoriteQuotes,
	updateUserFavoriteQuotes,
	createUserOtherNames,
	updateUserOtherNames,
	deleteUserOtherNames,
	getUserPhotosBy,
	getUserPhotosOf,
	cancelFriendRequest,
	searchUsers,
	getUserFriendsSuggestions,
	getFriendRequestsReceived,
} from "../controllers/user/user.controller";
import { getUserPosts } from "../controllers/post/post.controller";

const router = express.Router();

// /users/
router.get("/", getUsers);

// /users/search
router.get("/search", searchUsers);

// /users/search/friends
router.get("/search/friends", searchUserFriendsByName);

// /users/search/friends-not-family
router.get("/search/friends-not-family", searchUserFriendsExcludingFamily);

// /users/friends/suggestions
router.get("/friends/suggestions", getUserFriendsSuggestions);

// /users/me/friend-requests
router.get("/me/friend-requests", getFriendRequestsReceived);

// /users/me/friends/:friendId
router.delete("/me/friends/:friendId", unfriendUser);

// /users/me/friend-requests/:id
router.post("/me/friend-requests/:id", sendFriendRequest);

// /users/me/friend-requests/:id
router.delete("/me/friend-requests/:id", cancelFriendRequest);

// /users/me/friend-requests/:requestId/accept
router.post("/me/friend-requests/:requestId/accept", acceptFriendRequest);

// /users/me/friend-requests/:requestId/reject
router.delete("/me/friend-requests/:requestId/reject", rejectFriendRequest);

// /users/:id
router.get("/:id", getUserById);

// /users/:id/photos-of
router.get("/:id/photos-of", getUserPhotosOf);

// /users/:id/photos-by
router.get("/:id/photos-by", getUserPhotosBy);

// /users/:id/deleted
router.get("/:id/deleted", getDeletedUserById);

// /users
router.post("/", createUser);

// /updateUserPassword/:id
router.patch("/:id/password", updateUserPassword);

// /:id/profile-photo
router.patch("/:id/profile-photo", updateUserAvatarUrl);

// /:id/cover-photo
router.patch("/:id/cover-photo", updateUserCoverPhoto);

// /:id/bio
router.patch("/:id/bio", updateUserBio);

// /:id/hobbies
router.patch("/:id/hobbies", updateUserHobbies);

// /:id/intro
router.patch("/:id/intro", updateUserIntro);

// /:id/audience
router.patch("/:id/audience", updateUserAudienceSettings);

// /:id/phone-number
router.patch("/:id/phone-number", updateUserPhoneNumber);

// /:id/phone-number
router.delete("/:id/phone-number", deleteUserPhoneNumber);

// /:id/email
router.patch("/:id/email", updateUserEmail);

// /:id/websites
router.post("/:id/websites", createUserWebsites);

// /:id/websites/:websiteId
router.patch("/:id/websites/:websiteId", updateUserWebsites);

// /:id/websites/:websiteId
router.delete("/:id/websites/:websiteId", deleteUserWebsites);

// /:id/social-links
router.post("/:id/social-links", createUserSocialLinks);

// /:id/social-links/:socialLinkId
router.patch("/:id/social-links/:socialLinkId", updateUserSocialLinks);

// /:id/social-links/:socialLinkId
router.delete("/:id/social-links/:socialLinkId", deleteUserSocialLinks);

// /:id/gender
router.patch("/:id/gender", updateUserGender);

// /:id/gender
router.delete("/:id/gender", deleteUserGender);

// /:id/pronouns
router.patch("/:id/pronouns", updateUserPronouns);

// /:id/pronouns
router.delete("/:id/pronouns", deleteUserPronouns);

// /:id/birthday
router.patch("/:id/birthday", updateUserBirthday);

// /:id/languages
router.patch("/:id/languages", updateUserLanguages);

// /:id/languages
router.delete("/:id/languages", deleteUserLanguages);

// /:id/family-members
router.post("/:id/family-members", createUserFamilyMembers);

// /:id/family-members/:familyMemberId
router.patch("/:id/family-members/:familyMemberId", updateUserFamilyMembers);

// /:id/family-members/:familyMemberId
router.delete("/:id/family-members/:familyMemberId", deleteUserFamilyMembers);

// /:id/relationship
router.patch("/:id/relationship", updateUserRelationshipStatus);

// /:id/about-you
router.patch("/:id/about-you", updateUserAboutYou);

// /:id/about-you
router.delete("/:id/about-you", deleteUserAboutYou);

// /:id/name-pronunciation
router.patch("/:id/name-pronunciation", updateUserNamePronunciation);

// /:id/name-pronunciation
router.delete("/:id/name-pronunciation", deleteUserNamePronunciation);

// /:id/quotes
router.patch("/:id/quotes", updateUserFavoriteQuotes);

// /:id/quotes
router.delete("/:id/quotes", deleteUserFavoriteQuotes);

// /:id/other-names
router.post("/:id/other-names", createUserOtherNames);

// /:id/others-names/:otherNameId
router.patch("/:id/other-names/:otherNameId", updateUserOtherNames);

// /:id/others-names/:otherNameId
router.delete("/:id/other-names/:otherNameId", deleteUserOtherNames);

// /:id/work
router.post("/:id/work", createUserWork);

// /:id/work/:workId
router.patch("/:id/work/:workId", updateUserWork);

// /:id/work/:workId
router.delete("/:id/work/:workId", deleteUserWork);

// /:id/education
router.post("/:id/education", createUserEducation);

// /:id/education/:educationId
router.patch("/:id/education/:educationId", updateUserEducation);

// /:id/education/:educationId
router.delete("/:id/education/:educationId", deleteUserEducation);

// /:id/places-lived
router.post("/:id/places-lived", createUserPlacesLived);

// /:id/places-lived/:placeLivedId
router.patch("/:id/places-lived/:placeLivedId", updateUserPlacesLived);

// /:id/places-lived/:placeLivedId
router.delete("/:id/places-lived/:placeLivedId", deleteUserPlacesLived);

// /users/:id/posts
router.get("/:id/posts", getUserPosts);

// /users/:id/friends
router.get("/:id/friends", getUserFriends);

// /users/:id/saved-posts
router.get("/:id/saved-posts", getUserSavedPosts);

export default router;
