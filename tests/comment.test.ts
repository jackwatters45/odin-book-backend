// import express from "express";
// import request from "supertest";
// import { ObjectId } from "mongodb";
// import { Schema } from "mongoose";
// import debug from "debug";

// import clearDatabase from "../tools/populateDbs/utils/clearDatabase";
// import configRoutes from "../src/routes";
// import configAuth from "../src/middleware/authConfig";
// import configOtherMiddleware from "../src/middleware/otherConfig";
// import { configDb, disconnectFromDatabase } from "../src/config/database";
// import Reaction from "../src/models/reaction.model";
// import Post, { IPost } from "../src/models/post.model";
// import Comment, { IComment } from "../src/models/comment.model";
// import { createRandomUser, populateUsers } from "../tools/populateDbs/users";
// import { createPost, createPosts, createUsersPosts } from "../tools/populateDbs/posts/index";
// import { apiPath } from "../src/config/envVariables";
// import { IUser } from "../src/models/user.model";

// const log = debug("log:comment:test");

// const app = express();

// const users: IUser[] = [];
// const posts: IPost[] = [];

// let standardUser: IUser;
// let standardUserJwt: string | undefined;

// let randomUser: IUser;
// let randomJwt: string | undefined;

// let postNoComments: IPost;
// const numUsers = 3;
// beforeAll(async () => {
// 	await configDb();
// 	await clearDatabase();
// 	await configAuth(app);

// 	users.push(...((await populateUsers(numUsers)) as IUser[]));

// 	standardUser = await createRandomUser();
// 	standardUserJwt = standardUser.generateJwtToken();

// 	randomUser = users[0];
// 	randomJwt = randomUser.generateJwtToken();

// 	posts.push(...(await createUsersPosts(users)) as IPost[]);

// 	const randomPost = await createPost(
// 		randomUser,
// 		users.map((user) => user._id),
// 	);
// 	if (!randomPost) throw new Error("randomPost is undefined");
// 	postNoComments = randomPost;

// 	configOtherMiddleware(app);
// 	configRoutes(app);
// }, 10000);

// describe("GET /posts/:post/comments", () => {
// 	it("should return 200 and an array of comments", async () => {
// 		const post = posts[0];
// 		const res = await request(app)
// 			.get(`${apiPath}/posts/${post._id}/comments`)
// 			.expect(200);

// 		expect(res.body.comments).toHaveLength(post.comments.length);
// 		expect(res.body.comments).toEqual(
// 			expect.arrayContaining([
// 				expect.objectContaining({
// 					post: post._id.toString(),
// 				}),
// 			]),
// 		);

// 		expect(res.body.meta).toEqual(
// 			expect.objectContaining({
// 				total: post.comments.length,
// 				totalParent: expect.any(Number),
// 			}),
// 		);
// 	});

// 	it("should return 200 and an array of comments with limit", async () => {
// 		const post = posts[0];
// 		const res = await request(app)
// 			.get(`${apiPath}/posts/${post._id}/comments?limit=1`)
// 			.expect(200);

// 		expect(res.body.comments).toHaveLength(1);
// 		expect(res.body.comments).toEqual(
// 			expect.arrayContaining([
// 				expect.objectContaining({
// 					post: post._id.toString(),
// 				}),
// 			]),
// 		);

// 		expect(res.body.meta).toEqual(
// 			expect.objectContaining({
// 				total: post.comments.length,
// 				totalParent: expect.any(Number),
// 			}),
// 		);
// 	});

// 	it("should return 200 and an array of comments with offset", async () => {
// 		const post = posts[0];
// 		const firstCommentId = post.comments[0];
// 		const res = await request(app)
// 			.get(`${apiPath}/posts/${post._id}/comments?offset=1`)
// 			.expect(200);

// 		expect(res.body.comments).toHaveLength(post.comments.length - 1);
// 		expect(res.body.comments).toEqual(
// 			expect.arrayContaining([
// 				expect.objectContaining({
// 					post: post._id.toString(),
// 				}),
// 			]),
// 		);

// 		expect(res.body.comments).not.toEqual(
// 			expect.arrayContaining([
// 				expect.objectContaining({
// 					_id: firstCommentId,
// 				}),
// 			]),
// 		);

// 		expect(res.body.meta).toEqual(
// 			expect.objectContaining({
// 				total: post.comments.length,
// 				totalParent: expect.any(Number),
// 			}),
// 		);
// 	});

// 	it("should return 200 and an array of comments with limit and offset", async () => {
// 		const post = posts[0];
// 		const firstCommentId = post.comments[0];
// 		const res = await request(app)
// 			.get(`${apiPath}/posts/${post._id}/comments?limit=1&offset=1`)
// 			.expect(200);

// 		expect(res.body.comments).toHaveLength(1);
// 		expect(res.body.comments).toEqual(
// 			expect.arrayContaining([
// 				expect.objectContaining({
// 					post: post._id.toString(),
// 				}),
// 			]),
// 		);

// 		expect(res.body.comments).not.toEqual(
// 			expect.arrayContaining([
// 				expect.objectContaining({
// 					_id: firstCommentId,
// 				}),
// 			]),
// 		);

// 		expect(res.body.meta).toEqual(
// 			expect.objectContaining({
// 				total: post.comments.length,
// 				totalParent: expect.any(Number),
// 			}),
// 		);
// 	});

// 	it("should return 200 and an empty array of comments if post has no comments", async () => {
// 		const post = postNoComments;
// 		const res = await request(app)
// 			.get(`${apiPath}/posts/${post._id}/comments`)
// 			.expect(200);

// 		expect(res.body.comments).toHaveLength(0);
// 		expect(res.body.meta).toEqual(
// 			expect.objectContaining({
// 				total: 0,
// 				totalParent: 0,
// 			}),
// 		);
// 	});

// 	it("should return 404 if post does not exist", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/posts/${new ObjectId()}/comments`)
// 			.expect(404);
// 		expect(res.body.message).toBe("Post not found");
// 	});

// 	it("should return 500 if error occurs", async () => {
// 		jest.spyOn(Post, "findById").mockImplementationOnce(() => {
// 			throw new Error("error");
// 		});

// 		const res = await request(app)
// 			.get(`${apiPath}/posts/${new ObjectId()}/comments`)
// 			.expect(500);
// 		expect(res.body).toHaveProperty("message");
// 	});
// });

// describe("GET /posts/:post/comments/:id/replies", () => {
// 	const numReplies = 2;

// 	let post: IPost;
// 	let comment: Schema.Types.ObjectId;
// 	let replies: IComment[] = [];

// 	beforeAll(async () => {
// 		post = posts[0];
// 		comment = post.comments[0];
// 		const userIds = users.map((user) => user._id);
// 		replies = (await addRepliesToComment(
// 			comment,
// 			userIds,
// 			numReplies,
// 		)) as IComment[];
// 	});

// 	it("should return 200 and an array of replies", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/posts/${post._id}/comments/${comment}/replies`)
// 			.expect(200);

// 		expect(res.body.replies).toHaveLength(numReplies);
// 		expect(res.body.replies).toEqual(
// 			expect.arrayContaining([
// 				expect.objectContaining({
// 					post: post._id.toString(),
// 					parentComment: comment.toString(),
// 				}),
// 			]),
// 		);
// 	});

// 	it("should return 200 and an array of replies with limit", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/posts/${post._id}/comments/${comment}/replies?limit=1`)
// 			.expect(200);

// 		expect(res.body.replies).toHaveLength(1);
// 		expect(res.body.replies).toEqual(
// 			expect.arrayContaining([
// 				expect.objectContaining({
// 					post: post._id.toString(),
// 					parentComment: comment.toString(),
// 					_id: replies[0]._id.toString(),
// 				}),
// 			]),
// 		);
// 	});

// 	it("should return 200 and an array of replies with offset", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/posts/${post._id}/comments/${comment}/replies?offset=1`)
// 			.expect(200);

// 		expect(res.body.replies).toHaveLength(numReplies - 1);
// 		expect(res.body.replies).toEqual(
// 			expect.arrayContaining([
// 				expect.objectContaining({
// 					post: post._id.toString(),
// 					parentComment: comment.toString(),
// 				}),
// 			]),
// 		);
// 	});

// 	it("should return 200 and an array of replies with limit and offset", async () => {
// 		const res = await request(app)
// 			.get(
// 				`${apiPath}/posts/${post._id}/comments/${comment}/replies?limit=1&offset=1`,
// 			)
// 			.expect(200);

// 		expect(res.body.replies).toHaveLength(1);
// 		expect(res.body.replies).toEqual(
// 			expect.arrayContaining([
// 				expect.objectContaining({
// 					post: post._id.toString(),
// 					parentComment: comment.toString(),
// 					_id: replies[1]._id.toString(),
// 				}),
// 			]),
// 		);
// 	});

// 	it("should return 200 and an empty array of replies if comment has no replies", async () => {
// 		const post = posts[1];
// 		const comment = post.comments[0];
// 		const res = await request(app)
// 			.get(`${apiPath}/posts/${post._id}/comments/${comment}/replies`)
// 			.expect(200);
// 		expect(res.body.replies).toHaveLength(0);
// 	});

// 	it("should return 404 if post does not exist", async () => {
// 		const res = await request(app)
// 			.get(
// 				`${apiPath}/posts/${new ObjectId()}/comments/${new ObjectId()}/replies`,
// 			)
// 			.expect(404);
// 		expect(res.body.message).toBe("Post not found");
// 	});

// 	it("should return 404 if comment does not exist", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/posts/${post._id}/comments/${new ObjectId()}/replies`)
// 			.expect(404);
// 		expect(res.body.message).toBe("Comment not found");
// 	});

// 	it("should return 500 if error occurs", async () => {
// 		jest.spyOn(Comment, "find").mockImplementationOnce(() => {
// 			throw new Error("error");
// 		});

// 		const res = await request(app)
// 			.get(`${apiPath}/posts/${post._id}/comments/${comment}/replies`)
// 			.expect(500);
// 		expect(res.body).toHaveProperty("message");
// 	});
// });

// describe("GET /posts/:post/comments/:id", () => {
// 	it("should return 200 and a comment", async () => {
// 		const post = posts[0];
// 		const comment = post.comments[0];

// 		const res = await request(app)
// 			.get(`${apiPath}/posts/${post._id}/comments/${comment}`)
// 			.expect(200);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Comment found",
// 				comment: expect.objectContaining({
// 					post: post._id.toString(),
// 					_id: comment.toString(),
// 				}),
// 			}),
// 		);
// 	});

// 	it("should return 404 if post does not exist", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/posts/${new ObjectId()}/comments/${new ObjectId()}`)
// 			.expect(404);
// 		expect(res.body.message).toBe("Post not found");
// 	});

// 	it("should return 404 if comment does not exist", async () => {
// 		const post = posts[0];
// 		const res = await request(app)
// 			.get(`${apiPath}/posts/${post._id}/comments/${new ObjectId()}`)
// 			.expect(404);
// 		expect(res.body.message).toBe("Comment not found");
// 	});

// 	it("should return 500 if error occurs", async () => {
// 		jest.spyOn(Comment, "findById").mockImplementationOnce(() => {
// 			throw new Error("error");
// 		});

// 		const post = posts[0];
// 		const comment = post.comments[0];
// 		const res = await request(app)
// 			.get(`${apiPath}/posts/${post._id}/comments/${comment}`)
// 			.expect(500);
// 		expect(res.body).toHaveProperty("message");
// 	});
// });

// describe("POST /posts/:post/comments", () => {
// 	let post: IPost;
// 	beforeAll(() => (post = posts[0]));

// 	it("should return 201 and a comment", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/posts/${post._id}/comments`)
// 			.send({ content: "test comment" })
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(201);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Comment created",
// 				comment: expect.objectContaining({
// 					post: post._id.toString(),
// 					content: "test comment",
// 					author: expect.objectContaining({
// 						_id: standardUser._id.toString(),
// 					}),
// 				}),
// 			}),
// 		);
// 	});

// 	it("should return 400 if content is empty", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/posts/${post._id}/comments`)
// 			.send({ content: "" })
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(400);
// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				errors: expect.arrayContaining([
// 					expect.objectContaining({
// 						msg: "Comment content is required",
// 					}),
// 				]),
// 			}),
// 		);
// 	});

// 	it("should return 401 if no user is logged in", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/posts/${post._id}/comments`)
// 			.send({ content: "test comment" })
// 			.expect(401);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "You must be logged in to perform this action",
// 			}),
// 		);
// 	});

// 	it("should return 500 if error occurs", async () => {
// 		jest.spyOn(Comment.prototype, "save").mockImplementationOnce(() => {
// 			throw new Error("error");
// 		});

// 		const res = await request(app)
// 			.post(`${apiPath}/posts/${post._id}/comments`)
// 			.send({ content: "test comment" })
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(500);
// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "error",
// 			}),
// 		);
// 	});
// });

// describe("PATCH /posts/:post/comments/:id", () => {
// 	let post: IPost;
// 	let comment: IComment;

// 	beforeAll(async () => {
// 		comment = (await Comment.findOne({ author: standardUser._id })) as IComment;
// 		post = posts.find((post) => post.comments.includes(comment._id)) as IPost;
// 	});

// 	it("should return 201 and a comment", async () => {
// 		const content = "edited test comment";
// 		const res = await request(app)
// 			.patch(`${apiPath}/posts/${post._id}/comments/${comment._id}`)
// 			.send({ content })
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(201);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Comment updated",
// 				comment: expect.objectContaining({
// 					content: content,
// 					post: post._id.toString(),
// 				}),
// 			}),
// 		);
// 	});

// 	it("should return 400 if content is empty", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/posts/${post._id}/comments/${comment._id}`)
// 			.send({ content: "" })
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(400);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				errors: expect.arrayContaining([
// 					expect.objectContaining({
// 						msg: "Comment content is required",
// 					}),
// 				]),
// 			}),
// 		);
// 	});

// 	it("should return 401 if no user is logged in", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/posts/${post._id}/comments/${comment._id}`)
// 			.send({ content: "test comment" })
// 			.expect(401);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "You must be logged in to perform this action",
// 			}),
// 		);
// 	});

// 	it("should return 403 if user is not the original commenter", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/posts/${post._id}/comments/${comment._id}`)
// 			.send({ content: "test comment" })
// 			.set("Cookie", [`jwt=${randomJwt}`])
// 			.expect(403);
// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "You must be the original commenter to edit a comment",
// 			}),
// 		);
// 	});

// 	it("should return 404 if post does not exist", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/posts/${new ObjectId()}/comments/${comment._id}`)
// 			.send({ content: "test comment" })
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Post not found",
// 			}),
// 		);
// 	});

// 	it("should return 404 if comment does not exist", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/posts/${post._id}/comments/${new ObjectId()}`)
// 			.send({ content: "test comment" })
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Comment not found",
// 			}),
// 		);
// 	});

// 	it("should return 500 if error occurs", async () => {
// 		jest.spyOn(Comment.prototype, "save").mockImplementationOnce(() => {
// 			throw new Error("error");
// 		});

// 		const res = await request(app)
// 			.patch(`${apiPath}/posts/${post._id}/comments/${comment._id}`)
// 			.send({ content: "test comment" })
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(500);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "error",
// 			}),
// 		);
// 	});
// });

// describe("DELETE /posts/:post/comments/:id", () => {
// 	let post: IPost;
// 	let comment: IComment;

// 	beforeAll(async () => {
// 		comment = (await Comment.findOne({ author: standardUser._id })) as IComment;
// 		post = posts.find((post) => post.comments.includes(comment._id)) as IPost;
// 	});

// 	it("should return 200 and a comment", async () => {
// 		const res = await request(app)
// 			.delete(`${apiPath}/posts/${post._id}/comments/${comment._id}`)
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(200);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Comment deleted successfully",
// 				comment: expect.objectContaining({
// 					content: "[deleted]",
// 					post: post._id.toString(),
// 					author: standardUser._id.toString(),
// 				}),
// 			}),
// 		);
// 	});

// 	it("should return 401 if no user is logged in", async () => {
// 		const res = await request(app)
// 			.delete(`${apiPath}/posts/${post._id}/comments/${comment._id}`)
// 			.expect(401);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "You must be logged in to perform this action",
// 			}),
// 		);
// 	});

// 	it("should return 403 if user is not the original commenter", async () => {
// 		const res = await request(app)
// 			.delete(`${apiPath}/posts/${post._id}/comments/${comment._id}`)
// 			.set("Cookie", [`jwt=${randomJwt}`])
// 			.expect(403);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Not authorized",
// 			}),
// 		);
// 	});

// 	it("should return 404 if post does not exist", async () => {
// 		const res = await request(app)
// 			.delete(`${apiPath}/posts/${new ObjectId()}/comments/${comment._id}`)
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Post not found",
// 			}),
// 		);
// 	});

// 	it("should return 404 if comment does not exist", async () => {
// 		const res = await request(app)
// 			.delete(`${apiPath}/posts/${post._id}/comments/${new ObjectId()}`)
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Comment not found",
// 			}),
// 		);
// 	});

// 	it("should return 500 if error occurs", async () => {
// 		jest.spyOn(Comment.prototype, "save").mockImplementationOnce(() => {
// 			throw new Error("error");
// 		});

// 		const res = await request(app)
// 			.delete(`${apiPath}/posts/${post._id}/comments/${comment._id}`)
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(500);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "error",
// 			}),
// 		);
// 	});
// });

// describe("POST /posts/:post/comments/:id/react", () => {
// 	let post: IPost;
// 	let comment: IComment;

// 	beforeAll(async () => {
// 		post = posts[0];
// 		comment = (await Comment.findById(post.comments[0])) as IComment;
// 	});

// 	it("should return 201 and a comment", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/posts/${post._id}/comments/${comment._id}/react`)
// 			.send({ type: "like" })
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(201);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Reaction added",
// 				comment: expect.objectContaining({
// 					post: post._id.toString(),
// 					reactions: expect.any(Array),
// 				}),
// 			}),
// 		);
// 	});

// 	it("should return 400 if type is invalid", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/posts/${post._id}/comments/${comment._id}/react`)
// 			.send({ type: "invalid" })
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(400);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				errors: expect.arrayContaining([
// 					expect.objectContaining({
// 						msg: "Invalid reaction type",
// 					}),
// 				]),
// 			}),
// 		);
// 	});

// 	it("should return 401 if no user is logged in", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/posts/${post._id}/comments/${comment._id}/react`)
// 			.send({ type: "like" })
// 			.expect(401);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "You must be logged in to perform this action",
// 			}),
// 		);
// 	});

// 	it("should return 404 if post does not exist", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/posts/${new ObjectId()}/comments/${comment._id}/react`)
// 			.send({ type: "like" })
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Post not found",
// 			}),
// 		);
// 	});

// 	it("should return 404 if comment does not exist", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/posts/${post._id}/comments/${new ObjectId()}/react`)
// 			.send({ type: "like" })
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Comment not found",
// 			}),
// 		);
// 	});

// 	it("should return 500 if error occurs", async () => {
// 		jest.spyOn(Comment.prototype, "save").mockImplementationOnce(() => {
// 			throw new Error("error");
// 		});

// 		const res = await request(app)
// 			.post(`${apiPath}/posts/${post._id}/comments/${comment._id}/react`)
// 			.send({ type: "like" })
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(500);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "error",
// 			}),
// 		);
// 	});
// });

// describe("DELETE /posts/:post/comments/:id/unreact", () => {
// 	let post: IPost;
// 	let comment: IComment;

// 	beforeAll(async () => {
// 		post = (await Post.findById(posts[0]._id).populate({
// 			path: "comments",
// 			populate: { path: "reactions" },
// 		})) as IPost;
// 		comment = post.comments[0] as unknown as IComment;
// 	});
// 	beforeEach(async () => {
// 		const reaction = new Reaction({
// 			type: "like",
// 			user: standardUser._id,
// 			parent: comment._id,
// 		});

// 		await reaction.save();
// 	});

// 	it("should return 201 and a comment", async () => {
// 		const res = await request(app)
// 			.delete(`${apiPath}/posts/${post._id}/comments/${comment._id}/unreact`)
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(201);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Reaction removed",
// 				comment: expect.objectContaining({
// 					post: post._id.toString(),
// 					reactions: expect.not.arrayContaining([
// 						expect.objectContaining({
// 							user: standardUser._id.toString(),
// 						}),
// 					]),
// 				}),
// 			}),
// 		);
// 	});

// 	it("should return 401 if no user is logged in", async () => {
// 		const res = await request(app)
// 			.delete(`${apiPath}/posts/${post._id}/comments/${comment._id}/unreact`)
// 			.expect(401);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "You must be logged in to perform this action",
// 			}),
// 		);
// 	});

// 	it("should return 404 if post does not exist", async () => {
// 		const res = await request(app)
// 			.delete(
// 				`${apiPath}/posts/${new ObjectId()}/comments/${comment._id}/unreact`,
// 			)
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Post not found",
// 			}),
// 		);
// 	});

// 	it("should return 404 if comment does not exist", async () => {
// 		const res = await request(app)
// 			.delete(`${apiPath}/posts/${post._id}/comments/${new ObjectId()}/unreact`)
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Comment not found",
// 			}),
// 		);
// 	});

// 	it("should return 404 if user has not reacted", async () => {
// 		await Reaction.deleteOne({ user: users[0]._id, parent: comment._id });
// 		await Comment.findByIdAndUpdate(comment._id, {
// 			$pull: { reactions: { user: users[0]._id } },
// 		});

// 		const res = await request(app)
// 			.delete(`${apiPath}/posts/${post._id}/comments/${comment._id}/unreact`)
// 			.set("Cookie", [`jwt=${randomJwt}`])
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "User has not reacted to this comment",
// 			}),
// 		);
// 	});

// 	it("should return 500 if error occurs", async () => {
// 		jest.spyOn(Comment.prototype, "save").mockImplementationOnce(() => {
// 			throw new Error("error");
// 		});

// 		const res = await request(app)
// 			.delete(`${apiPath}/posts/${post._id}/comments/${comment._id}/unreact`)
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(500);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "error",
// 			}),
// 		);
// 	});
// });

// afterAll(async () => await disconnectFromDatabase());
