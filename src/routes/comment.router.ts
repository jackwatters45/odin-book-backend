import express from "express";
import {
	createComment,
	deleteComment,
	getCommentById,
	getComments,
	getReplies,
	updateComment,
	createCommentReply,
	reactToComment,
	unreactToComment,
} from "../controllers/comment.controller";

const router = express.Router({ mergeParams: true });

// posts/:post/comments
router.get("/", getComments);

// posts/:post/comments/:id/replies
router.get("/:id/replies", getReplies);

// posts/:post/comments/:id
router.get("/:id", getCommentById);

// posts/:post/comments
router.post("/", createComment);

// posts/:post/comments/:id
router.put("/:id", updateComment);

// posts/:post/comments/:id
router.delete("/:id", deleteComment);

// posts/:post/comments/:id/reply
router.post("/:id/reply", createCommentReply);

// posts/:post/comments/:id/react
router.post("/:id/react", reactToComment);

// posts/:post/comments/:id/unreact
router.post("/:id/unreact", unreactToComment);

export default router;
