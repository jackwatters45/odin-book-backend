import express from "express";
import {
	createPost,
	deletePost,
	getPostById,
	getPostReactions,
	getPosts,
	getPostsByFriends,
	getSavedPosts,
	reactToPost,
	sharePost,
	toggleSavedPost,
	unreactToPost,
	updatePost,
} from "../controllers/post.controller";

const router = express.Router();

// /posts/:id/react
router.patch("/:id/react", reactToPost);

// /posts/:id/unreact
router.delete("/:id/unreact", unreactToPost);

// /posts/:id/reactions
router.get("/:id/reactions", getPostReactions);

// /posts/saved-posts/:postId
router.patch("/saved-posts/:id", toggleSavedPost);

// /posts/saved-posts
router.get("/saved-posts", getSavedPosts);

// TODO
// /posts/:id/share
router.post("/:id/share", sharePost);

// /posts/friends
router.get("/friends", getPostsByFriends);

// /posts
router.get("/", getPosts);

// /posts/:id
router.get("/:id", getPostById);

// /posts
router.post("/", createPost);

// /posts/:id
router.patch("/:id", updatePost);

// /posts/:id
router.delete("/:id", deletePost);

// TODO probably comments preview in other router

export default router;
