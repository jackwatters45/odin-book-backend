import express from "express";
import {
	createPost,
	deletePost,
	getPostById,
	getPostPhotos,
	getPostReactions,
	getPosts,
	getPostsByUserFriends,
	getSavedPosts,
	reactToPost,
	toggleSavedPost,
	unreactToPost,
	updatePost,
	updatePostAudience,
} from "../controllers/post/post.controller";

const router = express.Router();

// /posts/:id/react
router.patch("/:id/react", reactToPost);

// /posts/:id/unreact
router.delete("/:id/unreact", unreactToPost);

// /posts/:id/reactions
router.get("/:id/reactions", getPostReactions);

// /posts/:id/photos
router.get("/:id/photos", getPostPhotos);

// /posts/:id/save
router.patch("/:id/save", toggleSavedPost);

// /posts/saved-posts
router.get("/saved-posts", getSavedPosts);

// /posts/friends
router.get("/friends", getPostsByUserFriends);

// /posts
router.get("/", getPosts);

// /posts/:id
router.get("/:id", getPostById);

// /posts
router.post("/", createPost);

// /posts/:id
router.patch("/:id", updatePost);

// /posts/:id/audience
router.patch("/:id/audience", updatePostAudience);

// /posts/:id
router.delete("/:id", deletePost);

export default router;
