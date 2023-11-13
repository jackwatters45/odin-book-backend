import express from "express";
import request from "supertest";
import { ObjectId } from "mongodb";
import debug from "debug";
import { faker } from "@faker-js/faker";

import { configDb, disconnectFromDatabase } from "../src/config/database";
import configRoutes from "../src/routes";
import configOtherMiddleware from "../src/middleware/otherConfig";
import User from "../src/models/user.model";
import { IUser } from "../types/IUser";
import Post, { IPost } from "../src/models/post.model";
import { apiPath } from "../src/config/envVariables";
import {
	createRandomPost,
	createPosts,
} from "../tools/populateDbs/posts/populatePosts";
import { createRandomUser } from "../tools/populateDbs/users/populateUsers";
import Reaction, { reactionTypes } from "../src/models/reaction.model";
import { getRandValueFromArray } from "../tools/populateDbs/utils/populateHelperFunctions";
import clearDatabase from "../tools/populateDbs/utils/clearDatabase";
import configAuth from "../src/middleware/authConfig";

const log = debug("log:post:test");

const app = express();

const users: IUser[] = [];

let standardUser: IUser;
let adminUser: IUser;
let randomUser: IUser;

let standardUserJwt: string | undefined;
let adminJwt: string | undefined;
let randomJwt: string | undefined;

beforeAll(async () => {
	await configDb();
	await clearDatabase();
	await configAuth(app);

	standardUser = await createRandomUser({ userType: "user" });
	standardUserJwt = standardUser.generateJwtToken();

	adminUser = await createRandomUser({ userType: "admin" });
	adminJwt = adminUser.generateJwtToken();

	randomUser = await createRandomUser({ userType: "user" });
	randomJwt = randomUser.generateJwtToken();

	users.push(standardUser, adminUser, randomUser);

	configOtherMiddleware(app);
	configRoutes(app);
}, 20000);

describe("GET /posts", () => {
	let posts: IPost[];
	const numPosts = 3;

	beforeAll(async () => {
		posts = await createPosts(numPosts, { allPublished: true });
		posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
	});

	it("should return an array of all posts and status 200", async () => {
		const res = await request(app).get(`${apiPath}/posts`).expect(200);

		expect(res.body.posts).toHaveLength(numPosts);
		expect(res.body.meta.total).toEqual(numPosts);

		expect(res.body.posts[0]._id.toString()).toEqual(posts[0]._id.toString());
		expect(res.body.posts[1]._id.toString()).toEqual(posts[1]._id.toString());
		expect(res.body.posts[2]._id.toString()).toEqual(posts[2]._id.toString());
	});

	it("should return an array of all posts with offset and limit query params", async () => {
		const offset = 1;
		const limit = 2;

		const res = await request(app)
			.get(`${apiPath}/posts`)
			.query({ offset, limit })
			.expect(200);

		expect(res.body.posts).toHaveLength(limit);
		expect(res.body.meta.total).toEqual(numPosts);

		expect(res.body.posts[0]._id.toString()).toEqual(
			posts[offset]._id.toString(),
		);
		expect(res.body.posts[1]._id.toString()).toEqual(
			posts[offset + 1]._id.toString(),
		);
	});

	it("should return an array of all posts with offset query param", async () => {
		const offset = 1;

		const res = await request(app)
			.get(`${apiPath}/posts`)
			.query({ offset })
			.expect(200);

		expect(res.body.posts).toHaveLength(numPosts - offset);
		expect(res.body.meta.total).toEqual(numPosts);

		expect(res.body.posts[0]._id.toString()).toEqual(
			posts[offset]._id.toString(),
		);
		expect(res.body.posts[1]._id.toString()).toEqual(
			posts[offset + 1]._id.toString(),
		);
	});

	it("should return an array of all posts with limit query param", async () => {
		const limit = 2;

		const res = await request(app)
			.get(`${apiPath}/posts`)
			.query({ limit })
			.expect(200);

		expect(res.body.posts).toHaveLength(limit);
		expect(res.body.meta.total).toEqual(numPosts);

		expect(res.body.posts[0]._id.toString()).toEqual(posts[0]._id.toString());
		expect(res.body.posts[1]._id.toString()).toEqual(posts[1]._id.toString());
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post, "countDocuments").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app).get(`${apiPath}/posts`).expect(500);
		expect(res.body.message).toEqual("Test error");
	});
});

describe("GET /posts/:id", () => {
	let post: IPost;

	beforeAll(async () => {
		post = await createRandomPost();
	});

	it("should return a post and status 200", async () => {
		const res = await request(app)
			.get(`${apiPath}/posts/${post._id.toString()}`)
			.expect(200);

		expect(res.body.post._id.toString()).toEqual(post._id.toString());
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post, "findById").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app)
			.get(`${apiPath}/posts/${post._id.toString()}`)
			.expect(500);
		expect(res.body.message).toEqual("Test error");
	});
});

describe("POST /posts", () => {
	it("should return a post and status 201 if the request is valid and the user is authenticated", async () => {
		const res = await request(app)
			.post(`${apiPath}/posts`)
			.send({ content: "Test post", published: faker.datatype.boolean() })
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(201);

		expect(res.body.post.content).toEqual("Test post");
	});

	it("should return an error message and 400 status code if the request body is invalid", async () => {
		const res = await request(app)
			.post(`${apiPath}/posts`)
			.send({ content: undefined, published: faker.datatype.boolean() })
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(400);

		expect(res.body.errors).toHaveLength(1);
		expect(res.body.errors[0].msg).toEqual(
			"At least one of the fields 'content', 'media' 'feeling', or 'checkIn' must be provided",
		);
	});

	it("should return an error message and 401 status code if the user is not authenticated", async () => {
		const res = await request(app)
			.post(`${apiPath}/posts`)
			.send({ content: "Test post", published: faker.datatype.boolean() })
			.expect(401);

		expect(res.body.message).toEqual(
			"You must be logged in to perform this action",
		);
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post.prototype, "save").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app)
			.post(`${apiPath}/posts`)
			.send({ content: "Test post", published: faker.datatype.boolean() })
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(500);

		expect(res.body.message).toEqual("Test error");
	});
});

describe("PATCH /posts/:id", () => {
	let post: IPost;

	beforeAll(async () => {
		post = await createRandomPost({ author: standardUser._id });
	});

	it("should return a post and status 200 if the request is valid and the user is the original author", async () => {
		const res = await request(app)
			.patch(`${apiPath}/posts/${post._id.toString()}`)
			.send({ content: "Test post", published: faker.datatype.boolean() })
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(200);

		expect(res.body.post.content).toEqual("Test post");
	});

	it("should return a post and status 200 if the request is valid and the user is an admin", async () => {
		const res = await request(app)
			.patch(`${apiPath}/posts/${post._id.toString()}`)
			.send({ content: "Test post", published: faker.datatype.boolean() })
			.set("Cookie", `jwt=${adminJwt}`)
			.expect(200);
		expect(res.body.post.content).toEqual("Test post");
	});

	it("should return an error message and 400 status code if the request body is invalid", async () => {
		const res = await request(app)
			.patch(`${apiPath}/posts/${post._id.toString()}`)
			.send({ content: undefined, published: faker.datatype.boolean() })
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(400);

		expect(res.body.errors).toHaveLength(1);
		expect(res.body.errors[0].msg).toEqual(
			"At least one of the fields 'content', 'media' 'feeling', or 'checkIn' must be provided",
		);
	});

	it("should return an error message and 401 status code if the user is not authenticated", async () => {
		const res = await request(app)
			.patch(`${apiPath}/posts/${post._id.toString()}`)
			.send({ content: "Test post", published: faker.datatype.boolean() })
			.expect(401);

		expect(res.body.message).toEqual(
			"You must be logged in to perform this action",
		);
	});

	it("should return an error message and 403 status code if the user is not the author of the post or an admin", async () => {
		const res = await request(app)
			.patch(`${apiPath}/posts/${post._id.toString()}`)
			.send({ content: "Test post", published: faker.datatype.boolean() })
			.set("Cookie", `jwt=${randomJwt}`)
			.expect(403);

		expect(res.body.message).toEqual(
			"Only admin and the original author can update post",
		);
	});

	it("should return an error message and 404 status code if the post is not found", async () => {
		const res = await request(app)
			.patch(`${apiPath}/posts/${new ObjectId().toString()}`)
			.send({ content: "Test post", published: faker.datatype.boolean() })
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(404);

		expect(res.body.message).toEqual("Post not found");
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post, "findById").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app)
			.patch(`${apiPath}/posts/${post._id.toString()}`)
			.send({ content: "Test post", published: faker.datatype.boolean() })
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(500);
		expect(res.body.message).toEqual("Test error");
	});
});

describe("DELETE /posts/:id", () => {
	let post: IPost;

	beforeAll(async () => {
		post = await createRandomPost({ author: standardUser._id });
	});

	it("should return an error message and 401 status code if the user is not authenticated", async () => {
		const res = await request(app)
			.delete(`${apiPath}/posts/${post._id.toString()}`)
			.expect(401);

		expect(res.body.message).toEqual(
			"You must be logged in to perform this action",
		);
	});

	it("should return an error message and 403 status code if the user is not the author of the post or an admin", async () => {
		const res = await request(app)
			.delete(`${apiPath}/posts/${post._id.toString()}`)
			.set("Cookie", `jwt=${randomJwt}`)
			.expect(403);

		expect(res.body.message).toEqual("Unauthorized");
	});

	it("should return an error message and 404 status code if the post is not found", async () => {
		const res = await request(app)
			.delete(`${apiPath}/posts/${new ObjectId().toString()}`)
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(404);

		expect(res.body.message).toEqual("Post not found");
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post, "findByIdAndDelete").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app)
			.delete(`${apiPath}/posts/${post._id.toString()}`)
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(500);

		expect(res.body.message).toEqual("Test error");
	});

	it("should return a post and status 200 if the request is valid and the user is authenticated", async () => {
		const res = await request(app)
			.delete(`${apiPath}/posts/${post._id.toString()}`)
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(200);

		expect(res.body.post._id.toString()).toEqual(post._id.toString());
	});
});

describe("PATCH /posts/:id/react", () => {
	let post: IPost;

	beforeAll(async () => {
		post = await createRandomPost({ author: randomUser._id });
	});

	it("should return a post and status 201 if the request is valid and the user is authenticated", async () => {
		const randomType = getRandValueFromArray(reactionTypes);

		const res = await request(app)
			.patch(`${apiPath}/posts/${post._id.toString()}/react`)
			.send({ type: randomType })
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(201);

		expect(res.body.post._id.toString()).toEqual(post._id.toString());

		const reaction = await Reaction.findOne({
			parent: post._id,
			user: standardUser._id,
			type: randomType,
		});

		expect(reaction).toBeTruthy();
	});

	it("should return an error message and 400 status code if the request body is invalid", async () => {
		const res = await request(app)
			.patch(`${apiPath}/posts/${post._id.toString()}/react`)
			.send({ type: undefined })
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(400);

		expect(res.body.errors).toHaveLength(1);
		expect(res.body.errors[0].msg).toEqual("Invalid reaction type");
	});

	it("should return an error message and 401 status code if the user is not authenticated", async () => {
		const res = await request(app)
			.patch(`${apiPath}/posts/${post._id.toString()}/react`)
			.send({ type: getRandValueFromArray(reactionTypes) })
			.expect(401);

		expect(res.body.message).toEqual(
			"You must be logged in to perform this action",
		);
	});

	it("should return an error message and 404 status code if the post is not found", async () => {
		const res = await request(app)
			.patch(`${apiPath}/posts/${new ObjectId().toString()}/react`)
			.send({ type: getRandValueFromArray(reactionTypes) })
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(404);

		expect(res.body.message).toEqual("Post not found");
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post, "findById").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app)
			.patch(`${apiPath}/posts/${post._id.toString()}/react`)
			.send({ type: getRandValueFromArray(reactionTypes) })
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(500);

		expect(res.body.message).toEqual("Test error");
	});
});

describe("DELETE /posts/:id/unreact", () => {
	let post: IPost;

	beforeAll(async () => {
		post = await createRandomPost({ author: randomUser._id });
		// });

		// beforeEach(async () => {
		await Reaction.create({
			parent: post._id,
			user: standardUser._id,
			type: getRandValueFromArray(reactionTypes),
		});
	});

	it("should return a post and status 200 if the request is valid and the user is authenticated", async () => {
		const res = await request(app)
			.delete(`${apiPath}/posts/${post._id.toString()}/unreact`)
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(200);

		expect(res.body.post._id.toString()).toEqual(post._id.toString());

		const reaction = await Reaction.findOne({
			parent: post._id,
			user: standardUser._id,
		});

		expect(reaction).toBeFalsy();
	});

	it("should return an error message and 401 status code if the user is not authenticated", async () => {
		const res = await request(app)
			.delete(`${apiPath}/posts/${post._id.toString()}/unreact`)
			.expect(401);

		expect(res.body.message).toEqual(
			"You must be logged in to perform this action",
		);
	});

	it("should return an error message and 404 status code if the post is not found", async () => {
		const res = await request(app)
			.delete(`${apiPath}/posts/${new ObjectId().toString()}/unreact`)
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(404);

		expect(res.body.message).toEqual("Post not found");
	});

	it("should return an error message and 404 status code if the user has not reacted to the post", async () => {
		const res = await request(app)
			.delete(`${apiPath}/posts/${post._id.toString()}/unreact`)
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(404);

		expect(res.body.message).toEqual("User has not reacted to this comment");
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post, "findById").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app)
			.delete(`${apiPath}/posts/${post._id.toString()}/unreact`)
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(500);

		expect(res.body.message).toEqual("Test error");
	});
});

describe("GET /posts/:id/reactions", () => {
	let post: IPost;

	beforeAll(async () => {
		post = await createRandomPost({ includeReactions: true });
	});

	it("should return an array of all reactions for a post and status 200", async () => {
		const res = await request(app)
			.get(`${apiPath}/posts/${post._id.toString()}/reactions`)
			.expect(200);

		expect(Array.isArray(res.body.reactions)).toBe(true);
		expect(res.body.reactions).toHaveLength(post.reactions.length);
	});

	it("should return an error message and 404 status code if the post is not found", async () => {
		const res = await request(app)
			.get(`${apiPath}/posts/${new ObjectId().toString()}/reactions`)
			.expect(404);

		expect(res.body.message).toEqual("Post not found");
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post, "findById").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app)
			.get(`${apiPath}/posts/${post._id.toString()}/reactions`)
			.expect(500);

		expect(res.body.message).toEqual("Test error");
	});
});

describe("PATCH /posts/saved-posts/:id", () => {
	let post: IPost;

	beforeAll(async () => {
		post = await createRandomPost({ author: randomUser._id });
	});

	it("should return a post and status 200 if the request is valid and the user is authenticated", async () => {
		const res = await request(app)
			.patch(`${apiPath}/posts/saved-posts/${post._id.toString()}`)
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(200);

		expect(res.body.savedPosts).toHaveLength(1);
		expect(res.body.savedPosts[0].toString()).toEqual(post._id.toString());
	});

	it("should return an error message and 401 status code if the user is not authenticated", async () => {
		const res = await request(app)
			.patch(`${apiPath}/posts/saved-posts/${post._id.toString()}`)
			.expect(401);

		expect(res.body.message).toEqual(
			"You must be logged in to perform this action",
		);
	});

	it("should return an error message and 404 status code if the post is not found", async () => {
		const res = await request(app)
			.patch(`${apiPath}/posts/saved-posts/${new ObjectId().toString()}`)
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(404);

		expect(res.body.message).toEqual("Post not found");
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(User, "findByIdAndUpdate").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app)
			.patch(`${apiPath}/posts/saved-posts/${post._id.toString()}`)
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(500);
		expect(res.body.message).toEqual("Test error");
	});
});

describe("GET /posts/saved-posts", () => {
	let post: IPost;
	beforeAll(async () => {
		post = await createRandomPost({ author: randomUser._id });

		standardUser.savedPosts = [post._id];
		await standardUser.save();
	});

	it("should return an array of all saved posts for a user and status 200", async () => {
		const res = await request(app)
			.get(`${apiPath}/posts/saved-posts`)
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(200);

		expect(res.body.posts).toHaveLength(1);
		expect(res.body.posts[0]._id.toString()).toEqual(post._id.toString());
		expect(res.body.posts).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					author: expect.any(Object),
				}),
			]),
		);
	});

	it("should return an error message and 401 status code if the user is not authenticated", async () => {
		const res = await request(app)
			.get(`${apiPath}/posts/saved-posts`)
			.expect(401);

		expect(res.body.message).toEqual(
			"You must be logged in to perform this action",
		);
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post, "find").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app)
			.get(`${apiPath}/posts/saved-posts`)
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(500);

		expect(res.body.message).toEqual("Test error");
	});
});

describe("POST /posts/:id/share", () => {
	let post: IPost;

	beforeAll(async () => {
		post = await createRandomPost({ author: randomUser._id });
	});

	it("should return a post and status 201 if the request is valid and the user is authenticated", async () => {
		const res = await request(app)
			.post(`${apiPath}/posts/${post._id.toString()}/share`)
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(201);

		expect(res.body.sharedPost.sharedFrom).toEqual(post._id.toString());
		expect(res.body.sharedPost._id.toString()).not.toEqual(post._id.toString());

		const sharedPost = await Post.findById(res.body.sharedPost._id);
		expect(sharedPost).toBeTruthy();
	});

	it("should return an error message and 401 status code if the user is not authenticated", async () => {
		const res = await request(app)
			.post(`${apiPath}/posts/${post._id.toString()}/share`)
			.expect(401);

		expect(res.body.message).toEqual(
			"You must be logged in to perform this action",
		);
	});

	it("should return an error message and 404 status code if the post is not found", async () => {
		const res = await request(app)
			.post(`${apiPath}/posts/${new ObjectId().toString()}/share`)
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(404);

		expect(res.body.message).toEqual("Post not found");
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post, "findById").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app)
			.post(`${apiPath}/posts/${post._id.toString()}/share`)
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(500);

		expect(res.body.message).toEqual("Test error");
	});
});

describe("GET /posts/friends", () => {
	it("should return an array of all posts from friends for a user and status 200", async () => {
		const res = await request(app)
			.get(`${apiPath}/posts/friends`)
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(200);

		expect(res.body.posts).toBeInstanceOf(Array);
		expect(res.body.meta.total).toBeGreaterThanOrEqual(0);
	});

	it("should return an error message and 401 status code if the user is not authenticated", async () => {
		const res = await await request(app)
			.get(`${apiPath}/posts/friends`)
			.expect(401);

		expect(res.body.message).toEqual(
			"You must be logged in to perform this action",
		);
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post, "find").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app)
			.get(`${apiPath}/posts/friends`)
			.set("Cookie", `jwt=${standardUserJwt}`)
			.expect(500);
		expect(res.body.message).toEqual("Test error");
	});
});

afterAll(async () => await disconnectFromDatabase());
