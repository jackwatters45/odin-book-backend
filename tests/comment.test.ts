import express, { NextFunction, Request, Response } from "express";
import request from "supertest";
import { ObjectId } from "mongodb";
import { Schema } from "mongoose";
import debug from "debug";

import { configDb, disconnectFromDatabase } from "../src/config/database";
import User, { IUser } from "../src/models/user-model/user.model";
import Post, { IPost } from "../src/models/post.model";
import Reaction, { IReaction } from "../src/models/reaction.model";
import Comment, { IComment } from "../src/models/comment.model";
import configRoutes from "../src/routes";
import configOtherMiddleware from "../src/middleware/otherConfig";
import { createUsers } from "../tools/populateDbs/users/populateUsers";
import {
	createRandomPost,
	createPosts,
} from "../tools/populateDbs/posts/populatePosts";
import { apiPath } from "../src/config/envVariables";
import { addRepliesToComment } from "../tools/populateDbs/posts/utils/addRepliesToComment";

const log = debug("log:comment:test");

const app = express();

// Passport Request Interface Extension
interface IRequestWithUser extends Request {
	user?: IUser;
}

// Mock Passport Authentication
// let userUndefined = false;
// let randomUser = false;
// let adminUser = false;

jest.mock("passport", () => ({
	authenticate: jest.fn((strategy, options) => {
		return async (req: IRequestWithUser, res: Response, next: NextFunction) => {
			req.user = (await Comment.findById(posts[0].author)) as IUser;
			next();
		};
	}),
}));

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
	postNoComments = await createRandomPost({ includeComments: false });

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

	let req: Request;
	let res: Response;

	beforeEach(() => {
		post = posts[0];
	});

	it("should return 201 and a comment", async () => {
		const res = await request(app)
			.post(`${apiPath}/posts/${post._id}/comments`)
			.send({ content: "test comment" });

		expect(res.status).toBe(201);
		// expect(res.json).toBeCalledWith(
		// 	expect.objectContaining({
		// 		content: req.body.content,
		// 		post: post._id,
		// 		author: expect.objectContaining({
		// 			_id: user._id,
		// 		}),
		// 	}),
		// );
	});

	it("should return 400 if content is empty", async () => {
		req.body.content = "";

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

		expect(res.status).toBeCalledWith(401);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "No user logged in",
			}),
		);
	});

	it("should return 403 if user is not the original commenter", async () => {
		req.user = users[num];

		expect(res.status).toBeCalledWith(403);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "You must be the original commenter to edit a comment",
			}),
		);
	});

	it("should return 404 if post does not exist", async () => {
		req.params.post = new ObjectId().toString();

		expect(res.status).toBeCalledWith(404);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Post not found",
			}),
		);
	});

	it("should return 404 if comment does not exist", async () => {
		req.params.id = new ObjectId().toString();

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

		expect(res.status).toBeCalledWith(401);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "No user logged in",
			}),
		);
	});

	it("should return 403 if user is not the original commenter", async () => {
		req.user = users[num];

		expect(res.status).toBeCalledWith(403);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Not authorized",
			}),
		);
	});

	it("should return 404 if post does not exist", async () => {
		req.params.post = new ObjectId().toString();

		expect(res.status).toBeCalledWith(404);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Post not found",
			}),
		);
	});

	it("should return 404 if comment does not exist", async () => {
		req.params.id = new ObjectId().toString();

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
		expect(res.status).toBeCalledWith(201);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Reaction added",
				comment: expect.objectContaining({
					post: post._id,
					reactions: expect.any(Array),
				}),
			}),
		);
	});

	it("should return 400 if type is invalid", async () => {
		req.body.type = "invalid";

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

		expect(res.status).toBeCalledWith(401);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "No user logged in",
			}),
		);
	});

	it("should return 404 if post does not exist", async () => {
		req.params.post = new ObjectId().toString();

		expect(res.status).toBeCalledWith(404);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Post not found",
			}),
		);
	});

	it("should return 404 if comment does not exist", async () => {
		req.params.id = new ObjectId().toString();

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

		expect(res.status).toBeCalledWith(500);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "error",
			}),
		);
	});
});

describe("POST /posts/:post/comments/:id/unreact", () => {
	let num = 0;
	let post: IPost;
	let user: IUser;

	let req: Request;
	let res: Response;

	beforeEach(async () => {
		const postId = posts[num]._id.toString();
		post = (await Post.findById(postId).populate({
			path: "comments",
			populate: {
				path: "reactions",
			},
		})) as IPost;

		const comment = post.comments[0] as unknown as IComment;

		const reaction = (await Reaction.findOne({
			parent: comment._id,
		})) as IReaction;
		user = (await User.findById(reaction.user)) as IUser;
		log(reaction, user._id);

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

		expect(res.status).toBeCalledWith(401);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "No user logged in",
			}),
		);
	});

	it("should return 404 if post does not exist", async () => {
		req.params.post = new ObjectId().toString();

		expect(res.status).toBeCalledWith(404);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Post not found",
			}),
		);
	});

	it("should return 404 if comment does not exist", async () => {
		req.params.id = new ObjectId().toString();

		expect(res.status).toBeCalledWith(404);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "Comment not found",
			}),
		);
	});

	it("should return 404 if reaction does not exist", async () => {
		req.user = { _id: new ObjectId() } as IUser;

		expect(res.status).toBeCalledWith(404);
		expect(res.json).toBeCalledWith(
			expect.objectContaining({
				message: "User has not reacted to this comment",
			}),
		);
	});

	it("should return 500 if error occurs", async () => {
		jest.spyOn(Comment.prototype, "save").mockImplementationOnce(() => {
			throw new Error("error");
		});

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
