import express from "express";
import {
	createPost,
	deletePost,
	getPostById,
	getPostReactions,
	getPosts,
	getPostsByUserFriends,
	getSavedPosts,
	reactToPost,
	sharePost,
	toggleSavedPost,
	unreactToPost,
	updatePost,
	updatePostAudience,
} from "../controllers/post.controller";

const router = express.Router();

// /posts/:id/react
router.patch("/:id/react", reactToPost);

// /posts/:id/unreact
router.delete("/:id/unreact", unreactToPost);

// /posts/:id/reactions
router.get("/:id/reactions", getPostReactions);

// /posts/:id/save
router.patch("/:id/save", toggleSavedPost);

// /posts/saved-posts
router.get("/saved-posts", getSavedPosts);

// TODO
// /posts/:id/share
router.post("/:id/share", sharePost);

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

// TODO probably comments preview in other router

export default router;
