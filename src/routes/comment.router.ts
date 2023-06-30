import express from "express";

const router = express.Router({ mergeParams: true });

// posts/:post/comments
// router.get("/", getComments);

// posts/:post/comments/:id
// router.get("/:id", getCommentById);

// posts/:post/comments
// router.post("/", createComment);

// posts/:post/comments/:id
// router.put("/:id", updateComment);

// posts/:post/comments/:id
// router.delete("/:id", deleteComment);

// TODO make sure this can unlike a comment (PUT?)
// posts/:post/comments/:id/like
// router.post("/:id/like", likeComment);

// TODO make sure other comment routes apply to replies
// posts/:post/comments/:id/reply
// router.post("/:id/reply", createCommentReply);

// posts/:post/comments/:id/replies
// router.get("/:id/replies", getReplies);

export default router;
