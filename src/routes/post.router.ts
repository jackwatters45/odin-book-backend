import express from "express";
import { getPostById, getPosts } from "../controllers/post.controller";

const router = express.Router();

// /posts
router.get("/", getPosts);

// /posts/:id
router.get("/:id", getPostById);

// /posts
// router.post("/", createPost);

// /posts/popular
// router.get("/popular", getPopularPosts);

// /posts/preview
// router.get("/preview", getPostsPreview);

// /posts/following
// router.get("/following", getFollowingPosts);

// /users/saved-posts/:id
// router.put("/saved-posts/:id", toggleSavedPost);

// /posts/:id
// router.put("/:id", updatePost);

// /posts/:id
// router.delete("/:id", deletePost);

// /posts/:id/like
// router.get("/:id/likes", getLikes);

// /posts/:id/like
// router.put("/:id/like", likePost);

// /posts/:id/unlike
// router.put("/:id/unlike", unlikePost);

export default router;
