import express, { NextFunction, Request, Response } from "express";
import request from "supertest";
import { ObjectId } from "mongodb";
import { Schema } from "mongoose";
import debug from "debug";

import { configDb, disconnectFromDatabase } from "../src/config/database";
import User, { IUser } from "../src/models/user-model/user.model";
import Post, { IPost } from "../src/models/post.model";
import Reaction from "../src/models/reaction.model";
import Comment, { IComment } from "../src/models/comment.model";
import configRoutes from "../src/routes";
import configOtherMiddleware from "../src/middleware/otherConfig";
import {
	createRandomUser,
	createUsers,
} from "../tools/populateDbs/users/populateUsers";
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
let userUndefined = false;
let randomUser = false;
// let adminUser = false;

jest.mock("passport", () => ({
	authenticate: jest.fn((strategy, options) => {
		return async (req: IRequestWithUser, res: Response, next: NextFunction) => {
			if (userUndefined) req.user = undefined;
			else if (randomUser) req.user = (await createRandomUser()) as IUser;
			else (req.user = users[0]) as IUser;
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
	beforeEach(() => (post = posts[0]));

	it("should return 201 and a comment", async () => {
		const res = await request(app)
			.post(`${apiPath}/posts/${post._id}/comments`)
			.send({ content: "test comment" });

		expect(res.status).toBe(201);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Comment created",
				comment: expect.objectContaining({
					post: post._id.toString(),
					content: "test comment",
					author: expect.objectContaining({
						_id: users[0]._id.toString(),
					}),
				}),
			}),
		);
	});

	it("should return 400 if content is empty", async () => {
		const res = await request(app)
			.post(`${apiPath}/posts/${post._id}/comments`)
			.send({ content: "" });

		expect(res.status).toBe(400);
		expect(res.body).toEqual(
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
		userUndefined = true;

		const res = await request(app)
			.post(`${apiPath}/posts/${post._id}/comments`)
			.send({ content: "test comment" });

		expect(res.status).toBe(401);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "No user logged in",
			}),
		);

		userUndefined = false;
	});

	it("should return 500 if error occurs", async () => {
		jest.spyOn(Comment.prototype, "save").mockImplementationOnce(() => {
			throw new Error("error");
		});

		const res = await request(app)
			.post(`${apiPath}/posts/${post._id}/comments`)
			.send({ content: "test comment" });

		expect(res.status).toBe(500);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "error",
			}),
		);
	});
});

describe("PUT /posts/:post/comments/:id", () => {
	let post: IPost;
	let comment: IComment;
	let user: IUser;

	beforeAll(() => (user = users[0]));
	beforeEach(async () => {
		comment = (await Comment.findOne({ author: user._id })) as IComment;
		post = posts.find((post) => post.comments.includes(comment._id)) as IPost;
	});

	it("should return 201 and a comment", async () => {
		const content = "edited test comment";
		const res = await request(app)
			.put(`${apiPath}/posts/${post._id}/comments/${comment._id}`)
			.send({ content });

		expect(res.status).toBe(201);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Comment updated",
				comment: expect.objectContaining({
					content: content,
					post: post._id.toString(),
				}),
			}),
		);
	});

	it("should return 400 if content is empty", async () => {
		const res = await request(app)
			.put(`${apiPath}/posts/${post._id}/comments/${comment._id}`)
			.send({ content: "" });

		expect(res.status).toBe(400);
		expect(res.body).toEqual(
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
		userUndefined = true;

		const res = await request(app)
			.put(`${apiPath}/posts/${post._id}/comments/${comment._id}`)
			.send({ content: "test comment" });

		expect(res.status).toBe(401);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "No user logged in",
			}),
		);

		userUndefined = false;
	});

	it("should return 403 if user is not the original commenter", async () => {
		randomUser = true;

		const res = await request(app)
			.put(`${apiPath}/posts/${post._id}/comments/${comment._id}`)
			.send({ content: "test comment" });

		expect(res.status).toBe(403);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "You must be the original commenter to edit a comment",
			}),
		);

		randomUser = false;
	});

	it("should return 404 if post does not exist", async () => {
		const res = await request(app)
			.put(`${apiPath}/posts/${new ObjectId()}/comments/${comment._id}`)
			.send({ content: "test comment" });

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Post not found",
			}),
		);
	});

	it("should return 404 if comment does not exist", async () => {
		const res = await request(app)
			.put(`${apiPath}/posts/${post._id}/comments/${new ObjectId()}`)
			.send({ content: "test comment" });

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Comment not found",
			}),
		);
	});

	it("should return 500 if error occurs", async () => {
		jest.spyOn(Comment.prototype, "save").mockImplementationOnce(() => {
			throw new Error("error");
		});

		const res = await request(app)
			.put(`${apiPath}/posts/${post._id}/comments/${comment._id}`)
			.send({ content: "test comment" });

		expect(res.status).toBe(500);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "error",
			}),
		);
	});
});

describe("DELETE /posts/:post/comments/:id", () => {
	let post: IPost;
	let comment: IComment;
	let user: IUser;

	beforeAll(() => (user = users[0]));
	beforeEach(async () => {
		comment = (await Comment.findOne({ author: user._id })) as IComment;
		post = posts.find((post) => post.comments.includes(comment._id)) as IPost;
	});

	it("should return 200 and a comment", async () => {
		const res = await request(app).delete(
			`${apiPath}/posts/${post._id}/comments/${comment._id}`,
		);

		expect(res.status).toBe(200);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Comment deleted successfully",
				comment: expect.objectContaining({
					content: "[deleted]",
					post: post._id.toString(),
					author: user._id.toString(),
				}),
			}),
		);
	});

	it("should return 401 if no user is logged in", async () => {
		userUndefined = true;

		const res = await request(app).delete(
			`${apiPath}/posts/${post._id}/comments/${comment._id}`,
		);

		expect(res.status).toBe(401);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "No user logged in",
			}),
		);

		userUndefined = false;
	});

	it("should return 403 if user is not the original commenter", async () => {
		randomUser = true;

		const res = await request(app).delete(
			`${apiPath}/posts/${post._id}/comments/${comment._id}`,
		);

		expect(res.status).toBe(403);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Not authorized",
			}),
		);

		randomUser = false;
	});

	it("should return 404 if post does not exist", async () => {
		const res = await request(app).delete(
			`${apiPath}/posts/${new ObjectId()}/comments/${comment._id}`,
		);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Post not found",
			}),
		);
	});

	it("should return 404 if comment does not exist", async () => {
		const res = await request(app).delete(
			`${apiPath}/posts/${post._id}/comments/${new ObjectId()}`,
		);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Comment not found",
			}),
		);
	});

	it("should return 500 if error occurs", async () => {
		jest.spyOn(Comment.prototype, "save").mockImplementationOnce(() => {
			throw new Error("error");
		});

		const res = await request(app).delete(
			`${apiPath}/posts/${post._id}/comments/${comment._id}`,
		);

		expect(res.status).toBe(500);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "error",
			}),
		);
	});
});

describe("POST /posts/:post/comments/:id/react", () => {
	let post: IPost;
	beforeEach(async () => (post = posts[0]));

	it("should return 201 and a comment", async () => {
		const res = await request(app)
			.post(`${apiPath}/posts/${post._id}/comments/${post.comments[0]}/react`)
			.send({ type: "like" });

		expect(res.status).toBe(201);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Reaction added",
				comment: expect.objectContaining({
					post: post._id.toString(),
					reactions: expect.any(Array),
				}),
			}),
		);
	});

	it("should return 400 if type is invalid", async () => {
		const res = await request(app)
			.post(`${apiPath}/posts/${post._id}/comments/${post.comments[0]}/react`)
			.send({ type: "invalid" });

		expect(res.status).toBe(400);
		expect(res.body).toEqual(
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
		userUndefined = true;

		const res = await request(app)
			.post(`${apiPath}/posts/${post._id}/comments/${post.comments[0]}/react`)
			.send({ type: "like" });

		expect(res.status).toBe(401);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "No user logged in",
			}),
		);

		userUndefined = false;
	});

	it("should return 404 if post does not exist", async () => {
		const res = await request(app)
			.post(
				`${apiPath}/posts/${new ObjectId()}/comments/${post.comments[0]}/react`,
			)
			.send({ type: "like" });

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Post not found",
			}),
		);
	});

	it("should return 404 if comment does not exist", async () => {
		const res = await request(app)
			.post(`${apiPath}/posts/${post._id}/comments/${new ObjectId()}/react`)
			.send({ type: "like" });

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Comment not found",
			}),
		);
	});

	it("should return 500 if error occurs", async () => {
		jest.spyOn(Comment.prototype, "save").mockImplementationOnce(() => {
			throw new Error("error");
		});

		const res = await request(app)
			.post(`${apiPath}/posts/${post._id}/comments/${post.comments[0]}/react`)
			.send({ type: "like" });

		expect(res.status).toBe(500);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "error",
			}),
		);
	});
});

describe("POST /posts/:post/comments/:id/unreact", () => {
	let post: IPost;
	let comment: IComment;

	beforeAll(async () => {
		post = (await Post.findById(posts[0]._id).populate({
			path: "comments",
			populate: { path: "reactions" },
		})) as IPost;

		comment = post.comments[0] as unknown as IComment;
	});
	beforeEach(async () => {
		const reaction = new Reaction({
			type: "like",
			user: users[0]._id,
			parent: comment._id,
		});

		await reaction.save();
	});

	it("should return 201 and a comment", async () => {
		log(post.comments[0]);
		const res = await request(app).post(
			`${apiPath}/posts/${post._id}/comments/${comment._id}/unreact`,
		);

		expect(res.status).toBe(201);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Reaction removed",
				comment: expect.objectContaining({
					post: post._id.toString(),
					reactions: expect.not.arrayContaining([
						expect.objectContaining({
							user: users[0]._id.toString(),
						}),
					]),
				}),
			}),
		);
	});

	it("should return 401 if no user is logged in", async () => {
		userUndefined = true;
		const res = await request(app).post(
			`${apiPath}/posts/${post._id}/comments/${comment._id}/unreact`,
		);

		expect(res.status).toBe(401);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "No user logged in",
			}),
		);

		userUndefined = false;
	});

	it("should return 404 if post does not exist", async () => {
		const res = await request(app).post(
			`${apiPath}/posts/${new ObjectId()}/comments/${comment._id}/unreact`,
		);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Post not found",
			}),
		);
	});

	it("should return 404 if comment does not exist", async () => {
		const res = await request(app).post(
			`${apiPath}/posts/${post._id}/comments/${new ObjectId()}/unreact`,
		);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Comment not found",
			}),
		);
	});

	it("should return 404 if reaction does not exist", async () => {
		randomUser = true;

		const res = await request(app).post(
			`${apiPath}/posts/${post._id}/comments/${comment._id}/unreact`,
		);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "User has not reacted to this comment",
			}),
		);

		randomUser = false;
	});

	it("should return 500 if error occurs", async () => {
		jest.spyOn(Comment.prototype, "save").mockImplementationOnce(() => {
			throw new Error("error");
		});

		const res = await request(app).post(
			`${apiPath}/posts/${post._id}/comments/${comment._id}/unreact`,
		);

		expect(res.status).toBe(500);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "error",
			}),
		);
	});
});

afterEach(() => jest.restoreAllMocks());
afterAll(async () => await disconnectFromDatabase());
