import express, { Request, Response } from "express";
import request from "supertest";
import { ObjectId } from "mongodb";
import { Schema } from "mongoose";
// import debug from "debug";

import { configDb, disconnectFromDatabase } from "../src/config/database";
import User, { IUser } from "../src/models/user-model/user.model";
import Post, { IPost } from "../src/models/post.model";
import Comment, { IComment } from "../src/models/comment.model";
import configRoutes from "../src/routes";
import configOtherMiddleware from "../src/middleware/otherConfig";
import { createUsers } from "../tools/populateDbs/users/populateUsers";
import {
	createPost,
	createPosts,
} from "../tools/populateDbs/posts/populatePosts";
import { apiPath } from "../src/config/envVariables";
import { addRepliesToComment } from "../tools/populateDbs/posts/utils/addRepliesToComment";
import {
	createComment,
	deleteComment,
	reactToComment,
	unreactToComment,
	updateComment,
} from "../src/controllers/comment.controller";

// const log = debug("log:comment:test");

const app = express();

let users: IUser[] = [];
let posts: IPost[] = [];

let postNoComments: IPost;
const numUsers = 5;

beforeAll(async () => {
	await configDb();

	await User.deleteMany({});
	await Post.deleteMany({});
	await Comment.deleteMany({});
	users = (await createUsers(numUsers)) as IUser[];
	posts = await createPosts(numUsers + 1);
	postNoComments = await createPost({ includeComments: false });

	configOtherMiddleware(app);
	configRoutes(app);
}, 10000);

describe("GET /posts/:post/comments", () => {
	it("should return 200 and an array of comments", async () => {
		const post = posts[0];
		const res = await request(app).get(`${apiPath}/posts/${post._id}/comments`);

		expect(res.status).toBe(200);

		expect(res.body.comments).toHaveLength(post.comments.length);
		expect(res.body.comments).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					post: post._id.toString(),
				}),
			]),
		);

		expect(res.body.meta).toEqual(
			expect.objectContaining({
				total: post.comments.length,
				totalParent: expect.any(Number),
			}),
		);
	});

	it("should return 200 and an array of comments with limit", async () => {
		const post = posts[0];
		const res = await request(app).get(
			`${apiPath}/posts/${post._id}/comments?limit=1`,
		);

		expect(res.status).toBe(200);

		expect(res.body.comments).toHaveLength(1);
		expect(res.body.comments).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					post: post._id.toString(),
				}),
			]),
		);

		expect(res.body.meta).toEqual(
			expect.objectContaining({
				total: post.comments.length,
				totalParent: expect.any(Number),
			}),
		);
	});

	it("should return 200 and an array of comments with offset", async () => {
		const post = posts[0];
		const firstCommentId = post.comments[0];
		const res = await request(app).get(
			`${apiPath}/posts/${post._id}/comments?offset=1`,
		);

		expect(res.status).toBe(200);

		expect(res.body.comments).toHaveLength(post.comments.length - 1);
		expect(res.body.comments).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					post: post._id.toString(),
				}),
			]),
		);

		expect(res.body.comments).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					_id: firstCommentId,
				}),
			]),
		);

		expect(res.body.meta).toEqual(
			expect.objectContaining({
				total: post.comments.length,
				totalParent: expect.any(Number),
			}),
		);
	});

	it("should return 200 and an array of comments with limit and offset", async () => {
		const post = posts[0];
		const firstCommentId = post.comments[0];
		const res = await request(app).get(
			`${apiPath}/posts/${post._id}/comments?limit=1&offset=1`,
		);

		expect(res.status).toBe(200);

		expect(res.body.comments).toHaveLength(1);
		expect(res.body.comments).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					post: post._id.toString(),
				}),
			]),
		);

		expect(res.body.comments).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					_id: firstCommentId,
				}),
			]),
		);

		expect(res.body.meta).toEqual(
			expect.objectContaining({
				total: post.comments.length,
				totalParent: expect.any(Number),
			}),
		);
	});

	it("should return 200 and an empty array of comments if post has no comments", async () => {
		const post = postNoComments;
		const res = await request(app).get(`${apiPath}/posts/${post._id}/comments`);

		expect(res.status).toBe(200);

		expect(res.body.comments).toHaveLength(0);
		expect(res.body.meta).toEqual(
			expect.objectContaining({
				total: 0,
				totalParent: 0,
			}),
		);
	});

	it("should return 404 if post does not exist", async () => {
		const res = await request(app).get(
			`${apiPath}/posts/${new ObjectId()}/comments`,
		);

		expect(res.status).toBe(404);
		expect(res.body.message).toBe("Post not found");
	});

	it("should return 500 if error occurs", async () => {
		jest.spyOn(Post, "findById").mockImplementationOnce(() => {
			throw new Error("error");
		});

		const res = await request(app).get(
			`${apiPath}/posts/${new ObjectId()}/comments`,
		);

		expect(res.status).toBe(500);
		expect(res.body).toHaveProperty("message");
	});
});

describe("GET /posts/:post/comments/:id/replies", () => {
	const numReplies = 2;

	let post: IPost;
	let comment: Schema.Types.ObjectId;
	let replies: IComment[] = [];

	beforeAll(async () => {
		post = posts[0];
		comment = post.comments[0];
		replies = (await addRepliesToComment(
			comment,
			users,
			numReplies,
		)) as IComment[];
	});

	it("should return 200 and an array of replies", async () => {
		const res = await request(app).get(
			`${apiPath}/posts/${post._id}/comments/${comment}/replies`,
		);

		expect(res.status).toBe(200);

		expect(res.body.replies).toHaveLength(numReplies);
		expect(res.body.replies).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					post: post._id.toString(),
					parentComment: comment.toString(),
				}),
			]),
		);
	});

	it("should return 200 and an array of replies with limit", async () => {
		const res = await request(app).get(
			`${apiPath}/posts/${post._id}/comments/${comment}/replies?limit=1`,
		);

		expect(res.status).toBe(200);

		expect(res.body.replies).toHaveLength(1);
		expect(res.body.replies).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					post: post._id.toString(),
					parentComment: comment.toString(),
					_id: replies[0]._id.toString(),
				}),
			]),
		);
	});

	it("should return 200 and an array of replies with offset", async () => {
		const res = await request(app).get(
			`${apiPath}/posts/${post._id}/comments/${comment}/replies?offset=1`,
		);

		expect(res.status).toBe(200);

		expect(res.body.replies).toHaveLength(numReplies - 1);
		expect(res.body.replies).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					post: post._id.toString(),
					parentComment: comment.toString(),
				}),
			]),
		);
	});

	it("should return 200 and an array of replies with limit and offset", async () => {
		const res = await request(app).get(
			`${apiPath}/posts/${post._id}/comments/${comment}/replies?limit=1&offset=1`,
		);

		expect(res.status).toBe(200);

		expect(res.body.replies).toHaveLength(1);
		expect(res.body.replies).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					post: post._id.toString(),
					parentComment: comment.toString(),
					_id: replies[1]._id.toString(),
				}),
			]),
		);
	});

	it("should return 200 and an empty array of replies if comment has no replies", async () => {
		const post = posts[1];
		const comment = post.comments[0];
		const res = await request(app).get(
			`${apiPath}/posts/${post._id}/comments/${comment}/replies`,
		);

		expect(res.status).toBe(200);
		expect(res.body.replies).toHaveLength(0);
	});

	it("should return 404 if post does not exist", async () => {
		const res = await request(app).get(
			`${apiPath}/posts/${new ObjectId()}/comments/${new ObjectId()}/replies`,
		);

		expect(res.status).toBe(404);
		expect(res.body.message).toBe("Post not found");
	});

	it("should return 404 if comment does not exist", async () => {
		const res = await request(app).get(
			`${apiPath}/posts/${post._id}/comments/${new ObjectId()}/replies`,
		);

		expect(res.status).toBe(404);
		expect(res.body.message).toBe("Comment not found");
	});

	it("should return 500 if error occurs", async () => {
		jest.spyOn(Comment, "find").mockImplementationOnce(() => {
			throw new Error("error");
		});

		const res = await request(app).get(
			`${apiPath}/posts/${post._id}/comments/${comment}/replies`,
		);

		expect(res.status).toBe(500);
		expect(res.body).toHaveProperty("message");
	});
});

describe("GET /posts/:post/comments/:id", () => {
	it("should return 200 and a comment", async () => {
		const post = posts[0];
		const comment = post.comments[0];
		const res = await request(app).get(
			`${apiPath}/posts/${post._id}/comments/${comment}`,
		);

		expect(res.status).toBe(200);

		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Comment found",
				comment: expect.objectContaining({
					post: post._id.toString(),
					_id: comment.toString(),
				}),
			}),
		);
	});

	it("should return 404 if post does not exist", async () => {
		const res = await request(app).get(
			`${apiPath}/posts/${new ObjectId()}/comments/${new ObjectId()}`,
		);

		expect(res.status).toBe(404);
		expect(res.body.message).toBe("Post not found");
	});

	it("should return 404 if comment does not exist", async () => {
		const post = posts[0];
		const res = await request(app).get(
			`${apiPath}/posts/${post._id}/comments/${new ObjectId()}`,
		);

		expect(res.status).toBe(404);
		expect(res.body.message).toBe("Comment not found");
	});

	it("should return 500 if error occurs", async () => {
		jest.spyOn(Comment, "findById").mockImplementationOnce(() => {
			throw new Error("error");
		});

		const post = posts[0];
		const comment = post.comments[0];
		const res = await request(app).get(
			`${apiPath}/posts/${post._id}/comments/${comment}`,
		);

		expect(res.status).toBe(500);
		expect(res.body).toHaveProperty("message");
	});
});

describe("POST /posts/:post/comments", () => {
	let post: IPost;
	let user: IUser;

	let req: Request;
	let res: Response;
	const next = jest.fn();

	beforeEach(() => {
		post = posts[0];
		user = users[0];

		req = {
			user,
			params: { post: post._id },
			body: { content: "test comment" },
		} as unknown as Request;

		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		} as unknown as Response;
	});

	it("should return 201 and a comment", async () => {
		for (let i = 1; i < createComment.length; i++) {
			await createComment[i](req, res, next);
		}

		expect(res.status).toBeCalledWith(201);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				content: req.body.content,
				post: post._id,
				author: expect.objectContaining({
					_id: user._id,
				}),
			}),
		);
	});

	it("should return 400 if content is empty", async () => {
		req.body.content = "";

		for (let i = 1; i < createComment.length; i++) {
			await createComment[i](req, res, next);
		}

		expect(res.status).toBeCalledWith(400);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				errors: expect.arrayContaining([
					expect.objectContaining({
						msg: "Comment content is required",
					}),
				]),
			}),
		);
	});

	it("should return 401 if no user is logged in", async () => {
		req.user = undefined;

		for (let i = 1; i < createComment.length; i++) {
			await createComment[i](req, res, next);
		}

		expect(res.status).toBeCalledWith(401);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "No user logged in",
			}),
		);
	});

	it("should return 500 if error occurs", async () => {
		jest.spyOn(Comment.prototype, "save").mockImplementationOnce(() => {
			throw new Error("error");
		});

		for (let i = 1; i < createComment.length; i++) {
			await createComment[i](req, res, next);
		}

		expect(res.status).toBeCalledWith(500);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "error",
			}),
		);
	});
});

describe("PUT /posts/:post/comments/:id", () => {
	let num = 0;
	let post: IPost;
	let user: IUser;
	let comment: IComment;

	let req: Request;
	let res: Response;
	const next = jest.fn();

	beforeEach(async () => {
		user = users[num];
		comment = (await Comment.findOne({ author: user._id })) as IComment;
		post = posts.find((post) => post.comments.includes(comment._id)) as IPost;

		req = {
			user,
			params: { post: post._id, id: comment._id },
			body: { content: "edited test comment" },
		} as unknown as Request;
		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		} as unknown as Response;

		num = num + 1 >= users.length ? 0 : num + 1;
	});

	it("should return 201 and a comment", async () => {
		for (let i = 1; i < createComment.length; i++) {
			await updateComment[i](req, res, next);
		}

		expect(res.status).toBeCalledWith(201);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Comment updated",
				comment: expect.objectContaining({
					content: req.body.content,
					post: post._id,
				}),
			}),
		);
	});

	it("should return 400 if content is empty", async () => {
		req.body.content = "";

		for (let i = 1; i < createComment.length; i++) {
			await updateComment[i](req, res, next);
		}

		expect(res.status).toBeCalledWith(400);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				errors: expect.arrayContaining([
					expect.objectContaining({
						msg: "Comment content is required",
					}),
				]),
			}),
		);
	});

	it("should return 401 if no user is logged in", async () => {
		req.user = undefined;

		for (let i = 1; i < createComment.length; i++) {
			await updateComment[i](req, res, next);
		}

		expect(res.status).toBeCalledWith(401);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "No user logged in",
			}),
		);
	});

	it("should return 403 if user is not the original commenter", async () => {
		req.user = users[num];

		for (let i = 1; i < createComment.length; i++) {
			await updateComment[i](req, res, next);
		}

		expect(res.status).toBeCalledWith(403);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "You must be the original commenter to edit a comment",
			}),
		);
	});

	it("should return 404 if post does not exist", async () => {
		req.params.post = new ObjectId().toString();

		for (let i = 1; i < createComment.length; i++) {
			await updateComment[i](req, res, next);
		}

		expect(res.status).toBeCalledWith(404);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Post not found",
			}),
		);
	});

	it("should return 404 if comment does not exist", async () => {
		req.params.id = new ObjectId().toString();

		for (let i = 1; i < createComment.length; i++) {
			await updateComment[i](req, res, next);
		}

		expect(res.status).toBeCalledWith(404);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Comment not found",
			}),
		);
	});

	it("should return 500 if error occurs", async () => {
		jest.spyOn(Comment.prototype, "save").mockImplementationOnce(() => {
			throw new Error("error");
		});

		for (let i = 1; i < createComment.length; i++) {
			await updateComment[i](req, res, next);
		}

		expect(res.status).toBeCalledWith(500);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "error",
			}),
		);
	});
});

describe("DELETE /posts/:post/comments/:id", () => {
	let num = 0;
	let post: IPost;
	let user: IUser;
	let comment: IComment;

	let req: Request;
	let res: Response;
	const next = jest.fn();

	beforeEach(async () => {
		user = users[num];
		comment = (await Comment.findOne({ author: user._id })) as IComment;
		post = posts.find((post) => post.comments.includes(comment._id)) as IPost;

		req = {
			user,
			params: { post: post._id, id: comment._id },
		} as unknown as Request;
		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		} as unknown as Response;

		num = num + 1 >= users.length ? 0 : num + 1;
	});

	it("should return 200 and a comment", async () => {
		await deleteComment[1](req, res, next);

		expect(res.status).toBeCalledWith(200);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Comment deleted successfully",
				comment: expect.objectContaining({
					content: "[deleted]",
					post: post._id,
					author: user._id,
				}),
			}),
		);
	});

	it("should return 401 if no user is logged in", async () => {
		req.user = undefined;

		await deleteComment[1](req, res, next);

		expect(res.status).toBeCalledWith(401);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "No user logged in",
			}),
		);
	});

	it("should return 403 if user is not the original commenter", async () => {
		req.user = users[num];

		await deleteComment[1](req, res, next);

		expect(res.status).toBeCalledWith(403);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Not authorized",
			}),
		);
	});

	it("should return 404 if post does not exist", async () => {
		req.params.post = new ObjectId().toString();

		await deleteComment[1](req, res, next);

		expect(res.status).toBeCalledWith(404);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Post not found",
			}),
		);
	});

	it("should return 404 if comment does not exist", async () => {
		req.params.id = new ObjectId().toString();

		await deleteComment[1](req, res, next);

		expect(res.status).toBeCalledWith(404);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Comment not found",
			}),
		);
	});

	it("should return 500 if error occurs", async () => {
		jest.spyOn(Comment.prototype, "save").mockImplementationOnce(() => {
			throw new Error("error");
		});

		await deleteComment[1](req, res, next);

		expect(res.status).toBeCalledWith(500);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "error",
			}),
		);
	});
});

describe("POST /posts/:post/comments/:id/react", () => {
	let num = 0;
	let post: IPost;
	let user: IUser;

	let req: Request;
	let res: Response;
	const next = jest.fn();

	beforeEach(async () => {
		user = users[num];
		post = posts[0];

		req = {
			user,
			params: { post: post._id, id: post.comments[0] },
			body: { type: "like" },
		} as unknown as Request;

		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		} as unknown as Response;

		num = num + 1 >= users.length ? 0 : num + 1;
	});

	it("should return 201 and a comment", async () => {
		for (let i = 1; i < reactToComment.length; i++) {
			await reactToComment[i](req, res, next);
		}

		expect(res.status).toBeCalledWith(201);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Reaction added",
				comment: expect.objectContaining({
					post: post._id,
					reactions: expect.arrayContaining([
						expect.objectContaining({
							user: user._id,
							type: req.body.type,
						}),
					]),
				}),
			}),
		);
	});

	it("should return 400 if type is invalid", async () => {
		req.body.type = "invalid";

		for (let i = 1; i < reactToComment.length; i++) {
			await reactToComment[i](req, res, next);
		}

		expect(res.status).toBeCalledWith(400);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				errors: expect.arrayContaining([
					expect.objectContaining({
						msg: "Invalid reaction type",
					}),
				]),
			}),
		);
	});

	it("should return 401 if no user is logged in", async () => {
		req.user = undefined;

		for (let i = 1; i < reactToComment.length; i++) {
			await reactToComment[i](req, res, next);
		}

		expect(res.status).toBeCalledWith(401);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "No user logged in",
			}),
		);
	});

	it("should return 404 if post does not exist", async () => {
		req.params.post = new ObjectId().toString();

		for (let i = 1; i < reactToComment.length; i++) {
			await reactToComment[i](req, res, next);
		}

		expect(res.status).toBeCalledWith(404);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Post not found",
			}),
		);
	});

	it("should return 404 if comment does not exist", async () => {
		req.params.id = new ObjectId().toString();

		for (let i = 1; i < reactToComment.length; i++) {
			await reactToComment[i](req, res, next);
		}

		expect(res.status).toBeCalledWith(404);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Comment not found",
			}),
		);
	});

	it("should return 500 if error occurs", async () => {
		jest.spyOn(Comment.prototype, "save").mockImplementationOnce(() => {
			throw new Error("error");
		});

		for (let i = 1; i < reactToComment.length; i++) {
			await reactToComment[i](req, res, next);
		}

		expect(res.status).toBeCalledWith(500);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "error",
			}),
		);
	});
});

// // @desc    Unreact to comment
// // @route   POST posts/:post/comments/:id/unreact
// // @access  Private
// export const unreactToComment = [
// 	passport.authenticate("jwt", { session: false }),
// 	expressAsyncHandler(async (req: Request, res: Response) => {
// 		const user = req.user as IUser;
// 		if (!user) {
// 			res.status(401).json({ message: "No user logged in" });
// 			return;
// 		}

// 		try {
// 			const [post, comment] = await Promise.all([
// 				Post.findById(req.params.post),
// 				Comment.findById(req.params.id),
// 			]);

// 			if (!post) {
// 				res.status(404).json({ message: "Post not found" });
// 				return;
// 			}

// 			if (!comment) {
// 				res.status(404).json({ message: "Comment not found" });
// 				return;
// 			}

// 			const reactionIndex = comment.reactions.findIndex(
// 				(reaction) => reaction.user === user._id.toString(),
// 			);

// 			if (reactionIndex === -1) {
// 				res.status(404).json({ message: "Reaction not found" });
// 				return;
// 			}

// 			comment.reactions.splice(reactionIndex, 1);
// 			await comment.save();

// 			res.status(201).json({ message: "Reaction removed", comment });
// 		} catch (error) {
// 			res.status(500).json({ message: error.message });
// 		}
// 	}),
// ];

describe("POST /posts/:post/comments/:id/unreact", () => {
	let num = 0;
	let post: IPost;
	let user: IUser;

	let req: Request;
	let res: Response;
	const next = jest.fn();

	beforeEach(async () => {
		const postId = posts[num]._id.toString();
		post = (await Post.findById(postId).populate({
			path: "comments",
			populate: {
				path: "reactions",
			},
		})) as IPost;

		const comment = post.comments[0] as unknown as IComment;

		user = (await User.findById(comment.reactions[0].user)) as IUser;

		req = {
			user,
			params: { post: post._id, id: post.comments[0] },
		} as unknown as Request;

		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		} as unknown as Response;

		num = num + 1 >= users.length ? 0 : num + 1;
	});

	it("should return 201 and a comment", async () => {
		await unreactToComment[1](req, res, next);

		expect(res.status).toBeCalledWith(201);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Reaction removed",
				comment: expect.objectContaining({
					post: post._id,
					reactions: expect.not.arrayContaining([
						expect.objectContaining({
							user: user._id,
						}),
					]),
				}),
			}),
		);
	});

	it("should return 401 if no user is logged in", async () => {
		req.user = undefined;

		await unreactToComment[1](req, res, next);

		expect(res.status).toBeCalledWith(401);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "No user logged in",
			}),
		);
	});

	it("should return 404 if post does not exist", async () => {
		req.params.post = new ObjectId().toString();

		await unreactToComment[1](req, res, next);

		expect(res.status).toBeCalledWith(404);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Post not found",
			}),
		);
	});

	it("should return 404 if comment does not exist", async () => {
		req.params.id = new ObjectId().toString();

		await unreactToComment[1](req, res, next);

		expect(res.status).toBeCalledWith(404);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Comment not found",
			}),
		);
	});

	it("should return 404 if reaction does not exist", async () => {
		req.user = { _id: new ObjectId() } as IUser;

		await unreactToComment[1](req, res, next);

		expect(res.status).toBeCalledWith(404);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Reaction not found",
			}),
		);
	});

	it("should return 500 if error occurs", async () => {
		jest.spyOn(Comment.prototype, "save").mockImplementationOnce(() => {
			throw new Error("error");
		});

		await unreactToComment[1](req, res, next);

		expect(res.status).toBeCalledWith(500);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "error",
			}),
		);
	});
});

afterEach(() => jest.restoreAllMocks());
afterAll(async () => await disconnectFromDatabase());

// TODO friend requests
// TODO notifications
