import express from "express";
import request from "supertest";

import { configDb, disconnectFromDatabase } from "../src/config/database";
import configRoutes from "../src/routes";
import configOtherMiddleware from "../src/middleware/otherConfig";
import User, { IUser } from "../src/models/user-model/user.model";
import Post, { IPost } from "../src/models/post.model";
import Comment from "../src/models/comment.model";
import { apiPath } from "../src/config/envVariables";
import { createPosts } from "../tools/populateDbs/posts/populatePosts";
import { createUsers } from "../tools/populateDbs/users/populateUsers";

const app = express();

const numUsers = 3;
const users: IUser[] = [];

const numPosts = 5;
const posts: IPost[] = [];

beforeAll(async () => {
	await configDb();

	await User.deleteMany({});
	await Post.deleteMany({});
	await Comment.deleteMany({});

	const sampleUsers = (await createUsers(numUsers)) as IUser[];
	users.push(...sampleUsers);

	const createdPosts = await createPosts(numPosts, { allPublished: true });
	posts.push(...createdPosts);
	posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

	configOtherMiddleware(app);
	configRoutes(app);
}, 20000);

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

afterEach(() => jest.restoreAllMocks());
afterAll(async () => await disconnectFromDatabase());
