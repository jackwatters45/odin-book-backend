import express, { NextFunction } from "express";
import request from "supertest";
import { ObjectId } from "mongodb";
import debug from "debug";
import { faker } from "@faker-js/faker";

import { configDb, disconnectFromDatabase } from "../src/config/database";
import configRoutes from "../src/routes";
import configOtherMiddleware from "../src/middleware/otherConfig";
import User, { IUser } from "../src/models/user-model/user.model";
import Post, { IPost } from "../src/models/post.model";
import { apiPath } from "../src/config/envVariables";
import {
	createRandomPost,
	createPosts,
} from "../tools/populateDbs/posts/populatePosts";
import {
	createRandomUser,
	createUsers,
} from "../tools/populateDbs/users/populateUsers";
import Reaction, { reactionTypes } from "../src/models/reaction.model";
import { getRandValueFromArray } from "../tools/populateDbs/utils/populateHelperFunctions";
import IRequestWithUser from "../types/IRequestWithUser";
import clearDatabase from "../tools/populateDbs/utils/clearDatabase";

const log = debug("log:post:test");

const app = express();

const numUsers = 3;
const users: IUser[] = [];

const numPosts = 5;
const posts: IPost[] = [];

beforeAll(async () => {
	await configDb();
	await clearDatabase();

	const sampleUsers = (await createUsers(numUsers)) as IUser[];
	users.push(...sampleUsers);

	posts.push(...(await createPosts(numPosts, { allPublished: true })));
	posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

	configOtherMiddleware(app);
	configRoutes(app);
}, 20000);

// Mock Passport Authentication
let userUndefined = false;
let randomUser = false;
let adminUser = false;

jest.mock("passport", () => ({
	authenticate: jest.fn((strategy, options) => {
		return async (req: IRequestWithUser, res: Response, next: NextFunction) => {
			if (userUndefined) req.user = undefined;
			else if (randomUser) req.user = await createRandomUser();
			else if (adminUser)
				req.user = await createRandomUser({ userType: "admin" });
			else req.user = (await User.findById(posts[0].author)) as IUser;
			next();
		};
	}),
}));

describe("GET /posts", () => {
	it("should return an array of all posts and status 200", async () => {
		const res = await request(app).get(`${apiPath}/posts`);

		expect(res.statusCode).toEqual(200);

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
			.query({ offset, limit });

		expect(res.statusCode).toEqual(200);

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

		const res = await request(app).get(`${apiPath}/posts`).query({ offset });

		expect(res.statusCode).toEqual(200);

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

		const res = await request(app).get(`${apiPath}/posts`).query({ limit });

		expect(res.statusCode).toEqual(200);

		expect(res.body.posts).toHaveLength(limit);
		expect(res.body.meta.total).toEqual(numPosts);

		expect(res.body.posts[0]._id.toString()).toEqual(posts[0]._id.toString());
		expect(res.body.posts[1]._id.toString()).toEqual(posts[1]._id.toString());
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post, "countDocuments").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app).get(`${apiPath}/posts`);

		expect(res.statusCode).toEqual(500);
		expect(res.body.message).toEqual("Test error");
	});
});

describe("GET /posts/:id", () => {
	it("should return a post and status 200", async () => {
		const res = await request(app).get(
			`${apiPath}/posts/${posts[0]._id.toString()}`,
		);

		expect(res.statusCode).toEqual(200);

		expect(res.body.post._id.toString()).toEqual(posts[0]._id.toString());
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post, "findById").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app).get(
			`${apiPath}/posts/${posts[0]._id.toString()}`,
		);

		expect(res.statusCode).toEqual(500);
		expect(res.body.message).toEqual("Test error");
	});
});

describe("POST /posts", () => {
	it("should return a post and status 201 if the request is valid and the user is authenticated", async () => {
		const res = await request(app)
			.post(`${apiPath}/posts`)
			.send({ content: "Test post", published: faker.datatype.boolean() });

		log(res.body);
		expect(res.statusCode).toEqual(201);
		expect(res.body.post.content).toEqual("Test post");
	});

	it("should return an error message and 400 status code if the request body is invalid", async () => {
		const res = await request(app)
			.post(`${apiPath}/posts`)
			.send({ content: undefined, published: faker.datatype.boolean() });

		expect(res.statusCode).toEqual(400);
		expect(res.body.errors).toHaveLength(1);
		expect(res.body.errors[0].msg).toEqual(
			"At least one of the fields 'content', 'media' 'feeling', 'lifeEvent', or 'checkIn' must be provided",
		);
	});

	it("should return an error message and 401 status code if the user is not authenticated", async () => {
		userUndefined = true;

		const res = await request(app)
			.post(`${apiPath}/posts`)
			.send({ content: "Test post", published: faker.datatype.boolean() });

		expect(res.statusCode).toEqual(401);
		expect(res.body.message).toEqual("Author is required");

		userUndefined = false;
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post.prototype, "save").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app)
			.post(`${apiPath}/posts`)
			.send({ content: "Test post", published: faker.datatype.boolean() });

		expect(res.statusCode).toEqual(500);
		expect(res.body.message).toEqual("Test error");
	});
});

describe("PATCH /posts/:id", () => {
	it("should return a post and status 200 if the request is valid and the user is the original author", async () => {
		const res = await request(app)
			.patch(`${apiPath}/posts/${posts[0]._id.toString()}`)
			.send({ content: "Test post", published: faker.datatype.boolean() });

		expect(res.statusCode).toEqual(200);
		expect(res.body.post.content).toEqual("Test post");
	});

	it("should return a post and status 200 if the request is valid and the user is an admin", async () => {
		adminUser = true;

		const res = await request(app)
			.patch(`${apiPath}/posts/${posts[0]._id.toString()}`)
			.send({ content: "Test post", published: faker.datatype.boolean() });

		expect(res.statusCode).toEqual(200);
		expect(res.body.post.content).toEqual("Test post");

		adminUser = false;
	});

	it("should return an error message and 400 status code if the request body is invalid", async () => {
		const res = await request(app)
			.patch(`${apiPath}/posts/${posts[0]._id.toString()}`)
			.send({ content: undefined, published: faker.datatype.boolean() });

		expect(res.statusCode).toEqual(400);
		expect(res.body.errors).toHaveLength(1);
		expect(res.body.errors[0].msg).toEqual(
			"At least one of the fields 'content', 'media' 'feeling', 'lifeEvent', or 'checkIn' must be provided",
		);
	});

	it("should return an error message and 401 status code if the user is not authenticated", async () => {
		userUndefined = true;

		const res = await request(app)
			.patch(`${apiPath}/posts/${posts[0]._id.toString()}`)
			.send({ content: "Test post", published: faker.datatype.boolean() });

		expect(res.statusCode).toEqual(401);
		expect(res.body.message).toEqual("No user logged in");

		userUndefined = false;
	});

	it("should return an error message and 403 status code if the user is not the author of the post or an admin", async () => {
		randomUser = true;

		const res = await request(app)
			.patch(`${apiPath}/posts/${posts[0]._id.toString()}`)
			.send({ content: "Test post", published: faker.datatype.boolean() });

		expect(res.statusCode).toEqual(403);
		expect(res.body.message).toEqual(
			"Only admin and the original author can update post",
		);

		randomUser = false;
	});

	it("should return an error message and 404 status code if the post is not found", async () => {
		const res = await request(app)
			.patch(`${apiPath}/posts/${new ObjectId().toString()}`)
			.send({ content: "Test post", published: faker.datatype.boolean() });

		expect(res.statusCode).toEqual(404);
		expect(res.body.message).toEqual("Post not found");
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post, "findById").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app)
			.patch(`${apiPath}/posts/${posts[0]._id.toString()}`)
			.send({ content: "Test post", published: faker.datatype.boolean() });

		expect(res.statusCode).toEqual(500);
		expect(res.body.message).toEqual("Test error");
	});
});

describe("DELETE /posts/:id", () => {
	afterAll(() => posts.shift());

	it("should return an error message and 401 status code if the user is not authenticated", async () => {
		userUndefined = true;

		const res = await request(app).delete(
			`${apiPath}/posts/${posts[0]._id.toString()}`,
		);

		expect(res.statusCode).toEqual(401);
		expect(res.body.message).toEqual("No user logged in");

		userUndefined = false;
	});

	it("should return an error message and 403 status code if the user is not the author of the post or an admin", async () => {
		randomUser = true;

		const res = await request(app).delete(
			`${apiPath}/posts/${posts[1]._id.toString()}`,
		);

		log(res.body);
		expect(res.statusCode).toEqual(403);
		expect(res.body.message).toEqual("Unauthorized");

		randomUser = false;
	});

	it("should return an error message and 404 status code if the post is not found", async () => {
		const res = await request(app).delete(
			`${apiPath}/posts/${new ObjectId().toString()}`,
		);

		expect(res.statusCode).toEqual(404);
		expect(res.body.message).toEqual("Post not found");
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post, "findByIdAndDelete").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app).delete(
			`${apiPath}/posts/${posts[0]._id.toString()}`,
		);

		expect(res.statusCode).toEqual(500);
		expect(res.body.message).toEqual("Test error");
	});

	it("should return a post and status 200 if the request is valid and the user is authenticated", async () => {
		const res = await request(app).delete(
			`${apiPath}/posts/${posts[0]._id.toString()}`,
		);

		expect(res.statusCode).toEqual(200);
		expect(res.body.post._id.toString()).toEqual(posts[0]._id.toString());
	});
});

describe("PATCH /posts/:id/react", () => {
	it("should return a post and status 201 if the request is valid and the user is authenticated", async () => {
		const randomType = getRandValueFromArray(reactionTypes);

		const res = await request(app)
			.patch(`${apiPath}/posts/${posts[0]._id.toString()}/react`)
			.send({ type: randomType });

		expect(res.statusCode).toEqual(201);
		expect(res.body.post._id.toString()).toEqual(posts[0]._id.toString());

		const reaction = await Reaction.findOne({
			parent: posts[0]._id,
			user: posts[0].author,
			type: randomType,
		});

		expect(reaction).toBeTruthy();
	});

	it("should return an error message and 400 status code if the request body is invalid", async () => {
		const res = await request(app)
			.patch(`${apiPath}/posts/${posts[0]._id.toString()}/react`)
			.send({ type: undefined });

		expect(res.statusCode).toEqual(400);
		expect(res.body.errors).toHaveLength(1);
		expect(res.body.errors[0].msg).toEqual("Invalid reaction type");
	});

	it("should return an error message and 401 status code if the user is not authenticated", async () => {
		userUndefined = true;

		const res = await request(app)
			.patch(`${apiPath}/posts/${posts[0]._id.toString()}/react`)
			.send({ type: getRandValueFromArray(reactionTypes) });

		expect(res.statusCode).toEqual(401);
		expect(res.body.message).toEqual("No user logged in");

		userUndefined = false;
	});

	it("should return an error message and 404 status code if the post is not found", async () => {
		const res = await request(app)
			.patch(`${apiPath}/posts/${new ObjectId().toString()}/react`)
			.send({ type: getRandValueFromArray(reactionTypes) });

		expect(res.statusCode).toEqual(404);
		expect(res.body.message).toEqual("Post not found");
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post, "findById").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app)
			.patch(`${apiPath}/posts/${posts[0]._id.toString()}/react`)
			.send({ type: getRandValueFromArray(reactionTypes) });

		expect(res.statusCode).toEqual(500);
		expect(res.body.message).toEqual("Test error");
	});
});

describe("DELETE /posts/:id/unreact", () => {
	it("should return a post and status 200 if the request is valid and the user is authenticated", async () => {
		const res = await request(app).delete(
			`${apiPath}/posts/${posts[0]._id.toString()}/unreact`,
		);

		expect(res.statusCode).toEqual(200);
		expect(res.body.post._id.toString()).toEqual(posts[0]._id.toString());

		const reaction = await Reaction.findOne({
			parent: posts[0]._id,
			user: posts[0].author,
		});

		expect(reaction).toBeFalsy();
	});

	it("should return an error message and 401 status code if the user is not authenticated", async () => {
		userUndefined = true;

		const res = await request(app).delete(
			`${apiPath}/posts/${posts[0]._id.toString()}/unreact`,
		);

		expect(res.statusCode).toEqual(401);
		expect(res.body.message).toEqual("No user logged in");

		userUndefined = false;
	});

	it("should return an error message and 404 status code if the post is not found", async () => {
		const res = await request(app).delete(
			`${apiPath}/posts/${new ObjectId().toString()}/unreact`,
		);

		expect(res.statusCode).toEqual(404);
		expect(res.body.message).toEqual("Post not found");
	});

	it("should return an error message and 404 status code if the user has not reacted to the post", async () => {
		const res = await request(app).delete(
			`${apiPath}/posts/${posts[0]._id.toString()}/unreact`,
		);

		expect(res.statusCode).toEqual(404);
		expect(res.body.message).toEqual("User has not reacted to this comment");
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post, "findById").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app).delete(
			`${apiPath}/posts/${posts[0]._id.toString()}/unreact`,
		);

		expect(res.statusCode).toEqual(500);
		expect(res.body.message).toEqual("Test error");
	});
});

describe("GET /posts/:id/reactions", () => {
	let post: IPost;
	beforeAll(async () => {
		const newPost = await createRandomPost({ includeReactions: true });
		if (!newPost) throw new Error("Error creating post");
		post = newPost;
	});

	it("should return an array of all reactions for a post and status 200", async () => {
		const res = await request(app).get(
			`${apiPath}/posts/${post._id.toString()}/reactions`,
		);

		expect(res.statusCode).toEqual(200);
		expect(Array.isArray(res.body.reactions)).toBe(true);
		expect(res.body.reactions).toHaveLength(post.reactions.length);
	});

	it("should return an error message and 404 status code if the post is not found", async () => {
		const res = await request(app).get(
			`${apiPath}/posts/${new ObjectId().toString()}/reactions`,
		);

		expect(res.statusCode).toEqual(404);
		expect(res.body.message).toEqual("Post not found");
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post, "findById").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app).get(
			`${apiPath}/posts/${posts[0]._id.toString()}/reactions`,
		);

		expect(res.statusCode).toEqual(500);
		expect(res.body.message).toEqual("Test error");
	});
});

describe("PATCH /posts/saved-posts/:id", () => {
	it("should return a post and status 200 if the request is valid and the user is authenticated", async () => {
		const res = await request(app).patch(
			`${apiPath}/posts/saved-posts/${posts[0]._id.toString()}`,
		);

		expect(res.statusCode).toEqual(200);
		expect(res.body.savedPosts).toHaveLength(1);
		expect(res.body.savedPosts[0].toString()).toEqual(posts[0]._id.toString());
	});

	it("should return an error message and 401 status code if the user is not authenticated", async () => {
		userUndefined = true;

		const res = await request(app).patch(
			`${apiPath}/posts/saved-posts/${posts[0]._id.toString()}`,
		);

		expect(res.statusCode).toEqual(401);
		expect(res.body.message).toEqual("No user logged in");

		userUndefined = false;
	});

	it("should return an error message and 404 status code if the post is not found", async () => {
		const res = await request(app).patch(
			`${apiPath}/posts/saved-posts/${new ObjectId().toString()}`,
		);

		expect(res.statusCode).toEqual(404);
		expect(res.body.message).toEqual("Post not found");
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(User, "findByIdAndUpdate").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app).patch(
			`${apiPath}/posts/saved-posts/${posts[0]._id.toString()}`,
		);

		expect(res.statusCode).toEqual(500);
		expect(res.body.message).toEqual("Test error");
	});
});

describe("GET /posts/saved-posts", () => {
	it("should return an array of all saved posts for a user and status 200", async () => {
		const res = await request(app).get(`${apiPath}/posts/saved-posts`);

		expect(res.statusCode).toEqual(200);

		expect(res.body.posts).toHaveLength(1);
		expect(res.body.posts[0]._id.toString()).toEqual(posts[0]._id.toString());
		expect(res.body.posts).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					author: expect.any(Object),
				}),
			]),
		);
	});

	it("should return an error message and 401 status code if the user is not authenticated", async () => {
		userUndefined = true;

		const res = await request(app).get(`${apiPath}/posts/saved-posts`);

		expect(res.statusCode).toEqual(401);
		expect(res.body.message).toEqual("No user logged in");

		userUndefined = false;
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post, "find").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app).get(`${apiPath}/posts/saved-posts`);

		expect(res.statusCode).toEqual(500);
		expect(res.body.message).toEqual("Test error");
	});
});

describe("POST /posts/:id/share", () => {
	it("should return a post and status 201 if the request is valid and the user is authenticated", async () => {
		const res = await request(app).post(
			`${apiPath}/posts/${posts[0]._id.toString()}/share`,
		);

		expect(res.statusCode).toEqual(201);
		log(res.body.sharedPost);
		log(posts[0]);
		expect(res.body.sharedPost.sharedFrom).toEqual(posts[0]._id.toString());
		expect(res.body.sharedPost._id.toString()).not.toEqual(
			posts[0]._id.toString(),
		);

		const sharedPost = await Post.findById(res.body.sharedPost._id);
		expect(sharedPost).toBeTruthy();
	});

	it("should return an error message and 401 status code if the user is not authenticated", async () => {
		userUndefined = true;

		const res = await request(app).post(
			`${apiPath}/posts/${posts[0]._id.toString()}/share`,
		);

		expect(res.statusCode).toEqual(401);
		expect(res.body.message).toEqual("No user logged in");

		userUndefined = false;
	});

	it("should return an error message and 404 status code if the post is not found", async () => {
		const res = await request(app).post(
			`${apiPath}/posts/${new ObjectId().toString()}/share`,
		);

		expect(res.statusCode).toEqual(404);
		expect(res.body.message).toEqual("Post not found");
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post, "findById").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app).post(
			`${apiPath}/posts/${posts[0]._id.toString()}/share`,
		);

		expect(res.statusCode).toEqual(500);
		expect(res.body.message).toEqual("Test error");
	});
});

describe("GET /posts/friends", () => {
	it("should return an array of all posts from friends for a user and status 200", async () => {
		const res = await request(app).get(`${apiPath}/posts/friends`);

		expect(res.statusCode).toEqual(200);
		expect(res.body.posts).toBeInstanceOf(Array);
		expect(res.body.meta.total).toBeGreaterThanOrEqual(0);
	});

	it("should return an error message and 401 status code if the user is not authenticated", async () => {
		userUndefined = true;

		const res = await request(app).get(`${apiPath}/posts/friends`);

		expect(res.statusCode).toEqual(401);
		expect(res.body.message).toEqual("No user logged in");

		userUndefined = false;
	});

	it("should return an error message and 500 status code if something goes wrong", async () => {
		jest.spyOn(Post, "find").mockImplementationOnce(() => {
			throw new Error("Test error");
		});

		const res = await request(app).get(`${apiPath}/posts/friends`);

		expect(res.statusCode).toEqual(500);
		expect(res.body.message).toEqual("Test error");
	});
});

afterEach(() => jest.restoreAllMocks());
afterAll(async () => await disconnectFromDatabase());
