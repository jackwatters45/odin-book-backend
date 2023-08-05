import express, { NextFunction, Response } from "express";
import request from "supertest";
import { ObjectId } from "mongodb";
import debug from "debug";

import getNextIndexArray from "../src/utils/getNextIndexArray";
import { disconnectFromDatabase, configDb } from "../src/config/database";
import configOtherMiddleware from "../src/middleware/otherConfig";
import configRoutes from "../src/routes";
import User, { IUser } from "../src/models/user-model/user.model";
import { IPost } from "../src/models/post.model";
import {
	createRandomUser,
	createUser,
} from "../tools/populateDbs/users/populateUsers";
import { apiPath } from "../src/config/envVariables";
import { createPosts } from "../tools/populateDbs/posts/populatePosts";

import generateUser, { TestUser } from "./utils/generateUser";
import {
	generateInvalidPassword,
	generatePassword,
} from "./utils/generatePassword";
import IRequestWithUser from "../types/IRequestWithUser";
import createUsersAndSavedPosts from "../tools/populateDbs/createUsersAndPosts";
import { addSavedPostsToUser } from "../tools/populateDbs/posts/utils/addSavedPosts";
import clearDatabase from "../tools/populateDbs/utils/clearDatabase";
import getPostIdsFromPosts from "./utils/getPostIdsFromPosts";

const log = debug("log:user:test");

const app = express();

const users: IUser[] = [];
const posts: IPost[] = [];

let randomUser: IUser;
let adminUser: IUser;
let standardUser: IUser;
let deletedUser: IUser;
const numUsers = 6;

beforeAll(async () => {
	await configDb();
	await clearDatabase();

	const usersAndPosts = await createUsersAndSavedPosts(numUsers - 2);
	posts.push(...usersAndPosts.posts);
	const postIds = getPostIdsFromPosts(posts);
	users.push(...usersAndPosts.users);

	deletedUser = (await createRandomUser({ isDeleted: true })) as IUser;
	randomUser = (await createUser(users, postIds, {
		userType: "user",
		posts,
		noFriends: true,
	})) as IUser;
	users.push(randomUser);
	adminUser = (await createUser(users, postIds, {
		userType: "admin",
		posts,
	})) as IUser;
	users.push(adminUser);
	standardUser = (await User.findById(posts[0].author)) as IUser;

	users.sort((a, b) => {
		if (!a.createdAt || !b.createdAt) return 0;
		return b.createdAt.getTime() - a.createdAt.getTime();
	});

	configOtherMiddleware(app);
	configRoutes(app);
}, 50000);

// Mock Passport Authentication
let isUserUndefined = false;
let isRandomUser = false;
let isAdminUser = true;

jest.mock("passport", () => ({
	authenticate: jest.fn((strategy, options) => {
		return async (req: IRequestWithUser, res: Response, next: NextFunction) => {
			if (isUserUndefined) req.user = undefined;
			else if (isRandomUser) req.user = randomUser;
			else if (isAdminUser) req.user = adminUser;
			else req.user = standardUser;
			next();
		};
	}),
}));

describe("GET /users", () => {
	it("should return an array of users", async () => {
		const res = await request(app).get(`${apiPath}/users`);

		expect(res.statusCode).toEqual(200);
		expect(res.body.meta.total).toEqual(numUsers);
		expect(res.body.users.length).toEqual(numUsers);

		expect(res.body.users[0].id).toEqual(users[0].id);
		expect(res.body.users[numUsers - 1].id).toEqual(users[numUsers - 1].id);
	});

	it("should limit + offset the number of users returned when limit and offset query param is provided", async () => {
		const res = await request(app)
			.get(`${apiPath}/users`)
			.query({ limit: 2, offset: 1 });

		expect(res.statusCode).toEqual(200);
		expect(res.body.users.length).toEqual(2);
		expect(res.body.meta.total).toEqual(numUsers);

		expect(res.body.users[0].id).toEqual(users[1].id);
		expect(res.body.users[1].id).toEqual(users[2].id);
	});

	it("should return a 500 error if the database query fails", async () => {
		jest.spyOn(User, "find").mockImplementationOnce(() => {
			throw new Error("Database error");
		});

		const res = await request(app).get(`${apiPath}/users`);

		expect(User.find).toHaveBeenCalled();
		expect(res.statusCode).toEqual(500);
		expect(res.body.message).toEqual("Database error");
	});
});

describe("GET /users/:id", () => {
	it("should return the user details and posts by the given user id", async () => {
		const res = await request(app).get(`${apiPath}/users/${users[0].id}`);

		expect(res.statusCode).toEqual(200);
		expect(res.body.user.id).toEqual(users[0].id);

		expect(Array.isArray(res.body.posts)).toBe(true);
		expect(Array.isArray(res.body.comments)).toBe(true);

		if (res.body.posts.length > 0)
			expect(res.body.posts[0].author).toEqual(res.body.user.id);

		if (res.body.comments.length > 0)
			expect(res.body.comments[0].author).toEqual(res.body.user.id);
	});

	it("should return a 403 error if the user is deleted", async () => {
		const res = await request(app).get(`${apiPath}/users/${deletedUser.id}`);

		expect(res.statusCode).toEqual(403);
		expect(res.body.message).toEqual("This user has been deleted.");

		expect(res.body.posts).not.toBeDefined();
		expect(res.body.comments).not.toBeDefined();
	});

	it("should return a 500 error if the database query fails", async () => {
		jest.spyOn(User, "findById").mockImplementationOnce(() => {
			throw new Error("Database error");
		});

		const res = await request(app).get(`${apiPath}/users/${users[0].id}`);

		expect(res.statusCode).toEqual(500);
		expect(res.body.message).toEqual("Database error");

		expect(res.body.posts).not.toBeDefined();
		expect(res.body.comments).not.toBeDefined();
	});
});

describe("GET /users/:id/deleted", () => {
	it("should return the user details and posts by the given user id", async () => {
		const res = await request(app).get(
			`${apiPath}/users/${deletedUser.id}/deleted`,
		);

		expect(res.status).toBe(200);
		expect(res.body).toEqual({
			user: expect.objectContaining({
				id: deletedUser.id,
				isDeleted: true,
			}),
			posts: expect.any(Array),
			comments: expect.any(Array),
		});

		if (res.body.posts.length > 0)
			expect(res.body.posts[0].author.toString()).toEqual(res.body.user.id);

		if (res.body.comments.length > 0)
			expect(res.body.comments[0].author.toString()).toEqual(res.body.user.id);
	});

	it("should return a 403 error if the user is not an admin", async () => {
		isAdminUser = false;

		const res = await request(app).get(
			`${apiPath}/users/${deletedUser.id}/deleted`,
		);

		expect(res.status).toBe(403);
		expect(res.body).toEqual({
			message: "Unauthorized",
		});
		expect(res.body.posts).not.toBeDefined();

		isAdminUser = true;
	});

	it("should return a 401 error if the user is not logged in", async () => {
		isUserUndefined = true;

		const res = await request(app).get(
			`${apiPath}/users/${deletedUser.id}/deleted`,
		);

		expect(res.status).toBe(401);
		expect(res.body).toEqual({
			message: "User not logged in",
		});

		isUserUndefined = false;
	});

	it("should return a 500 error if the database query fails", async () => {
		jest.spyOn(User, "findById").mockImplementationOnce(() => {
			throw new Error("Database error");
		});

		const res = await request(app).get(
			`${apiPath}/users/${deletedUser.id}/deleted`,
		);

		expect(res.status).toBe(500);
		expect(res.body).toEqual({
			message: "Database error",
		});
	});
});

describe("POST /createUser", () => {
	let existingUser: TestUser;

	beforeAll(() => (existingUser = generateUser()));

	it("should create a new user", async () => {
		const res = await request(app)
			.post(`${apiPath}/users`)
			.send({ ...existingUser });

		expect(res.status).toBe(201);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "User created successfully",
				user: expect.objectContaining({
					_id: expect.any(String),
					firstName: existingUser.firstName,
					lastName: existingUser.lastName,
					birthday: existingUser.birthday,
					pronouns: existingUser.pronouns,
				}),
			}),
		);
	});

	it("should fail when the user already exists", async () => {
		const res = await request(app)
			.post(`${apiPath}/users`)
			.send({ ...existingUser });

		expect(res.status).toBe(400);
		expect(res.body).toEqual({
			message: "User with this email/phone already exists",
		});
	});

	it("should fail when password is not min 8 chars and does not contain an uppercase, lowercase, number, special character ", async () => {
		const res = await request(app)
			.post(`${apiPath}/users`)
			.send({ ...generateUser(), password: generateInvalidPassword() });

		expect(res.status).toBe(400);
		expect(res.body).toEqual(
			expect.objectContaining({
				errors: expect.arrayContaining([
					expect.objectContaining({
						msg: expect.stringContaining(
							"Password must contain at least one uppercase letter, one lowercase letter, one special character, one number, and be at least 8 characters long",
						),
					}),
				]),
			}),
		);
	});

	it("should fail when required fields are not provided", async () => {
		const res = await request(app)
			.post(`${apiPath}/users`)
			.send({ ...generateUser(), firstName: undefined });

		expect(res.status).toBe(400);
		expect(res.body).toEqual(
			expect.objectContaining({
				errors: expect.arrayContaining([
					expect.objectContaining({
						msg: expect.stringContaining("First name is required"),
					}),
				]),
			}),
		);
	});

	it("should not fail when no pronouns provided", async () => {
		const newUser = generateUser();
		const res = await request(app)
			.post(`${apiPath}/users`)
			.send({ ...newUser, pronouns: undefined });

		expect(res.status).toBe(201);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "User created successfully",
				user: expect.objectContaining({
					_id: expect.any(String),
					firstName: newUser.firstName,
					lastName: newUser.lastName,
					birthday: newUser.birthday,
				}),
			}),
		);
	});

	it("should fail when no user is provided", async () => {
		isUserUndefined = true;

		const res = await request(app)
			.post(`${apiPath}/users`)
			.send({ ...existingUser });

		expect(res.status).toBe(401);
		expect(res.body).toEqual({
			message: "User not logged in",
		});

		isUserUndefined = false;
	});

	it("should fail when user is not an admin", async () => {
		isAdminUser = false;

		const res = await request(app)
			.post(`${apiPath}/users`)
			.send({ ...existingUser });

		expect(res.status).toBe(403);
		expect(res.body).toEqual({
			message: "Unauthorized",
		});

		isAdminUser = true;
	});

	it("should fail when database query fails", async () => {
		jest.spyOn(User, "findOne").mockImplementationOnce(() => {
			throw new Error("Database error");
		});

		const res = await request(app)
			.post(`${apiPath}/users`)
			.send({ ...existingUser });

		expect(res.status).toBe(500);
		expect(res.body).toEqual({
			message: "Database error",
		});
	});
});

describe("PATCH /updateUserPassword/:id", () => {
	let userNum = 0;
	let user: IUser;
	let validPassword: string;

	beforeEach(async () => {
		user = users[userNum];
		validPassword = generatePassword();
		userNum = getNextIndexArray(userNum, users.length);
	});

	it("should update the user password", async () => {
		const res = await request(app)
			.patch(`${apiPath}/users/updateUser/${user.id}/password`)
			.send({ newPassword: validPassword, confirmPassword: validPassword });

		expect(res.status).toBe(201);
		expect(res.body).toEqual({
			message: "Password updated successfully",
		});
	});

	it("should fail when passwords do not match", async () => {
		const res = await request(app)
			.patch(`${apiPath}/users/updateUser/${user.id}/password`)
			.send({
				newPassword: validPassword,
				confirmPassword: generatePassword(),
			});

		expect(res.status).toBe(400);
		expect(res.body).toEqual(
			expect.objectContaining({
				errors: expect.arrayContaining([
					expect.objectContaining({
						msg: expect.stringContaining("Passwords do not match"),
					}),
				]),
			}),
		);
	});

	it("should fail when new password does not meet requirements", async () => {
		const invalidPassword = generateInvalidPassword();
		const res = await request(app)
			.patch(`${apiPath}/users/updateUser/${user.id}/password`)
			.send({ newPassword: invalidPassword, confirmPassword: invalidPassword });

		expect(res.status).toBe(400);
		expect(res.body).toEqual(
			expect.objectContaining({ errors: expect.any(Array) }),
		);
	});

	it("should fail when user is not found", async () => {
		const res = await request(app)
			.patch(
				`${apiPath}/users/updateUser/${new ObjectId().toString()}/password`,
			)
			.send({ newPassword: validPassword, confirmPassword: validPassword });

		expect(res.status).toBe(404);
		expect(res.body).toEqual({ message: "User not found" });
	});

	it("should fail when user is not logged in", async () => {
		isUserUndefined = true;

		const res = await request(app)
			.patch(`${apiPath}/users/updateUser/${user.id}/password`)
			.send({ newPassword: validPassword, confirmPassword: validPassword });

		expect(res.status).toBe(401);
		expect(res.body).toEqual({ message: "User not logged in" });

		isUserUndefined = false;
	});

	it("should fail when user is not an admin", async () => {
		isAdminUser = false;

		const res = await request(app)
			.patch(`${apiPath}/users/updateUser/${user.id}/password`)
			.send({ newPassword: validPassword, confirmPassword: validPassword });

		expect(res.status).toBe(403);
		expect(res.body).toEqual({ message: "Unauthorized" });

		isAdminUser = true;
	});

	it("should fail when database query fails", async () => {
		jest.spyOn(User, "findById").mockImplementationOnce(() => {
			throw new Error("Database error");
		});

		const res = await request(app)
			.patch(`${apiPath}/users/updateUser/${user.id}/password`)
			.send({ newPassword: validPassword, confirmPassword: validPassword });

		expect(res.status).toBe(500);
		expect(res.body).toEqual({ message: "Database error" });
	});
});

describe("PATCH /updateUser/:id/basic", () => {
	let userData: Partial<IUser>;

	beforeAll(() => {
		const user = standardUser;
		userData = {
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			phoneNumber: user.phoneNumber,
			birthday: user.birthday,
			pronouns: user.pronouns,
			userType: user.userType,
		};
	});

	it("should update the user", async () => {
		const res = await request(app)
			.patch(`${apiPath}/users/updateUser/${standardUser.id}/basic`)
			.send({ ...userData, firstName: "New First Name" });

		expect(res.status).toBe(201);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "User updated successfully",
				updatedUser: expect.any(Object),
			}),
		);
	});

	it("should fail when required fields are not provided", async () => {
		const res = await request(app)
			.patch(`${apiPath}/users/updateUser/${standardUser.id}/basic`)
			.send({ ...userData, firstName: undefined });

		expect(res.status).toBe(400);
		expect(res.body).toEqual(
			expect.objectContaining({
				errors: expect.any(Array),
			}),
		);
	});

	it("should fail when user is not found", async () => {
		const res = await request(app)
			.patch(`${apiPath}/users/updateUser/${new ObjectId().toString()}/basic`)
			.send({ ...userData, firstName: "New First Name" });

		expect(res.status).toBe(404);
		expect(res.body).toEqual({ message: "User not found" });
	});

	it("should fail when user is not logged in", async () => {
		isUserUndefined = true;

		const res = await request(app)
			.patch(`${apiPath}/users/updateUser/${standardUser.id}/basic`)
			.send({ ...userData, firstName: "New First Name" });

		expect(res.status).toBe(401);
		expect(res.body).toEqual({ message: "No user logged in" });

		isUserUndefined = false;
	});

	it("should fail when user is not an admin", async () => {
		isRandomUser = true;

		const res = await request(app)
			.patch(`${apiPath}/users/updateUser/${standardUser.id}/basic`)
			.send({ ...userData, firstName: "New First Name" });

		expect(res.status).toBe(403);
		expect(res.body).toEqual({ message: "Unauthorized" });

		isRandomUser = false;
	});

	it("should update user when user is not an admin but is editing their own profile", async () => {
		isAdminUser = false;

		const res = await request(app)
			.patch(`${apiPath}/users/updateUser/${standardUser.id}/basic`)
			.send({ ...userData, lastName: "New Last Name" });

		expect(res.status).toBe(201);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "User updated successfully",
				updatedUser: expect.any(Object),
			}),
		);

		isAdminUser = true;
	});

	it("should fail when database query fails", async () => {
		jest.spyOn(User, "findById").mockImplementationOnce(() => {
			throw new Error("Database error");
		});

		const res = await request(app)
			.patch(`${apiPath}/users/updateUser/${standardUser.id}/basic`)
			.send({ ...userData, firstName: "New First Name" });

		expect(res.status).toBe(500);
		expect(res.body).toEqual({ message: "Database error" });
	});
});

describe("GET /:id/posts", () => {
	let userPosts: IPost[];
	beforeAll(async () => {
		userPosts = await createPosts(3, { author: standardUser._id });
	});

	it("should return the user's posts", async () => {
		const res = await request(app).get(
			`${apiPath}/users/${standardUser.id}/posts`,
		);

		expect(res.status).toBe(200);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Posts retrieved successfully",
				posts: expect.arrayContaining([
					expect.objectContaining({
						content: expect.any(String),
						author: standardUser.id,
					}),
				]),
				meta: expect.objectContaining({
					total: expect.any(Number),
				}),
			}),
		);
	});

	it("should return the user's posts with pagination", async () => {
		const res = await request(app).get(
			`${apiPath}/users/${standardUser.id}/posts?limit=2&offset=1`,
		);

		expect(res.status).toBe(200);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Posts retrieved successfully",
				posts: expect.arrayContaining([
					expect.objectContaining({
						content: expect.any(String),
						author: standardUser.id,
					}),
				]),
				meta: expect.objectContaining({
					total: expect.any(Number),
				}),
			}),
		);

		expect(res.body.posts.length).toBe(2);
		expect(res.body.posts[0]._id.toString()).toBe(userPosts[1]._id.toString());
	});

	it("should return error when user is not found", async () => {
		const res = await request(app).get(
			`${apiPath}/users/${new ObjectId()}/posts`,
		);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "User not found",
			}),
		);
	});

	it("should return error when user has been deleted", async () => {
		const res = await request(app).get(
			`${apiPath}/users/${deletedUser._id}/posts`,
		);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "User has been deleted",
			}),
		);
	});

	it("should return empty array when user has no posts", async () => {
		const user = await createRandomUser();
		if (!user) throw new Error("User not created");

		const res = await request(app).get(`${apiPath}/users/${user.id}/posts`);

		expect(res.status).toBe(200);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Posts retrieved successfully",
				posts: expect.arrayContaining([]),
				meta: expect.objectContaining({
					total: 0,
				}),
			}),
		);
	});

	it("should return error when database query fails", async () => {
		jest.spyOn(User, "findById").mockImplementationOnce(() => {
			throw new Error("Database error");
		});

		const res = await request(app).get(
			`${apiPath}/users/${standardUser.id}/posts`,
		);

		expect(res.status).toBe(500);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Database error",
			}),
		);
	});
});

describe("GET /:id/friends", () => {
	it("should return the user's friends", async () => {
		const res = await request(app).get(
			`${apiPath}/users/${adminUser.id}/friends`,
		);

		expect(res.status).toBe(200);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Friends retrieved successfully",
				friends: expect.arrayContaining([
					expect.objectContaining({
						_id: expect.any(String),
						firstName: expect.any(String),
						lastName: expect.any(String),
						avatarUrl: expect.any(String),
					}),
				]),
			}),
		);
	});

	it("should return error when user is not found", async () => {
		const res = await request(app).get(
			`${apiPath}/users/${new ObjectId()}/friends`,
		);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "User not found",
			}),
		);
	});

	it("should return error when user has been deleted", async () => {
		const res = await request(app).get(
			`${apiPath}/users/${deletedUser._id}/friends`,
		);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "User has been deleted",
			}),
		);
	});

	it("should return empty array when user has no friends", async () => {
		const user = await createRandomUser();
		if (!user) throw new Error("User not created");

		const res = await request(app).get(`${apiPath}/users/${user.id}/friends`);

		expect(res.status).toBe(200);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Friends retrieved successfully",
				friends: expect.arrayContaining([]),
			}),
		);
	});

	it("should return error when database query fails", async () => {
		jest.spyOn(User, "findById").mockImplementationOnce(() => {
			throw new Error("Database error");
		});

		const res = await request(app).get(
			`${apiPath}/users/${new ObjectId()}/friends`,
		);

		expect(res.status).toBe(500);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Database error",
			}),
		);
	});
});

describe("GET /:id/saved-posts", () => {
	it("should return the user's saved posts", async () => {
		const res = await request(app).get(
			`${apiPath}/users/${standardUser.id}/saved-posts`,
		);

		expect(res.status).toBe(200);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Saved posts retrieved successfully",
				savedPosts: expect.arrayContaining([
					expect.objectContaining({
						_id: expect.any(String),
						content: expect.any(String),
					}),
				]),
				meta: expect.objectContaining({
					total: standardUser.savedPosts.length,
				}),
			}),
		);
	});

	it("should return the user's saved posts with pagination", async () => {
		if (standardUser.savedPosts.length < 3) {
			await addSavedPostsToUser(standardUser, getPostIdsFromPosts(posts));
		}

		const res = await request(app).get(
			`${apiPath}/users/${standardUser.id}/saved-posts?limit=2&offset=1`,
		);

		expect(res.status).toBe(200);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Saved posts retrieved successfully",
				savedPosts: expect.arrayContaining([
					expect.objectContaining({
						_id: expect.any(String),
						content: expect.any(String),
					}),
				]),
				meta: expect.objectContaining({
					total: standardUser.savedPosts.length,
				}),
			}),
		);

		expect(res.body.savedPosts.length).toBe(2);
		expect(res.body.savedPosts[0]._id.toString()).toBe(
			standardUser.savedPosts[1].toString(),
		);
	});

	it("should return an empty array when user has no saved posts", async () => {
		const user = await createRandomUser();

		const res = await request(app).get(
			`${apiPath}/users/${user.id}/saved-posts`,
		);

		expect(res.status).toBe(200);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Saved posts retrieved successfully",
				savedPosts: expect.arrayContaining([]),
				meta: expect.objectContaining({
					total: 0,
				}),
			}),
		);
	});

	it("should return error when user is not signed in", async () => {
		isUserUndefined = true;

		const res = await request(app).get(
			`${apiPath}/users/${standardUser.id}/saved-posts`,
		);

		expect(res.status).toBe(401);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "User not logged in",
			}),
		);

		isUserUndefined = false;
	});

	it("should return error when user is not found", async () => {
		const res = await request(app).get(
			`${apiPath}/users/${new ObjectId()}/saved-posts`,
		);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "User not found",
			}),
		);
	});

	it("should return error when user has been deleted", async () => {
		const res = await request(app).get(
			`${apiPath}/users/${deletedUser._id}/saved-posts`,
		);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "User not found",
			}),
		);
	});

	it("should return error when database query fails", async () => {
		jest.spyOn(User, "findOne").mockImplementationOnce(() => {
			throw new Error("Database error");
		});

		const res = await request(app).get(
			`${apiPath}/users/${deletedUser._id}/saved-posts`,
		);

		expect(res.status).toBe(500);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Database error",
			}),
		);
	});
});

describe("POST /users/me/friend-requests/:id", () => {
	it("should respond with 200 if user successfully sends a friend request", async () => {
		isRandomUser = true;
		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${standardUser.id}`,
		);

		expect(res.status).toBe(200);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Friend request sent successfully",
			}),
		);

		isRandomUser = false;
	});

	it("should respond with 401 if user is not logged in", async () => {
		isUserUndefined = true;

		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${standardUser.id}`,
		);

		expect(res.status).toBe(401);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "You must be logged in to perform this action",
			}),
		);

		isUserUndefined = false;
	});

	it("should respond with 400 if user tries to send a friend request to self", async () => {
		isAdminUser = false;

		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${standardUser.id}`,
		);
		expect(res.status).toBe(400);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "You cannot send a friend request to yourself",
			}),
		);
	});

	it("should respond with 404 if user to follow does not exist", async () => {
		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${new ObjectId()}`,
		);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "User not found",
			}),
		);
	});

	it("should respond with 404 if user to follow has been deleted", async () => {
		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${deletedUser._id}`,
		);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "User not found",
			}),
		);
	});

	it("should respond with 400 if user is already a friend", async () => {
		isRandomUser = true;

		// add users[0] as a friend to randomUser and send friend request from randomUser to users[0]
		const user = standardUser;
		try {
			await User.findByIdAndUpdate(user._id, {
				$push: { friends: randomUser._id },
			});
			await User.findByIdAndUpdate(randomUser._id, {
				$push: { friends: user._id },
			});
			log("Added friend");
		} catch (error) {
			throw new Error(error);
		}

		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${user.id}`,
		);

		expect(res.status).toBe(400);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Already friends with user",
			}),
		);
	});

	it("should respond with 500 if database query fails", async () => {
		jest.spyOn(User, "findById").mockImplementationOnce(() => {
			throw new Error("Database error");
		});

		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${adminUser.id}`,
		);

		expect(res.status).toBe(500);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Database error",
			}),
		);
	});
});

describe("DELETE /users/me/friends/:friendId", () => {
	let userToRemove: IUser;
	beforeAll(async () => {
		userToRemove = standardUser;
		try {
			await User.findByIdAndUpdate(adminUser.id, {
				$addToSet: { friends: userToRemove.id },
			});
			await User.findByIdAndUpdate(userToRemove.id, {
				$push: { friends: adminUser.id },
			});
		} catch (error) {
			throw new Error(error);
		}
	});

	it("should respond with 200 if user successfully unfriends another user", async () => {
		const res = await request(app).delete(
			`${apiPath}/users/me/friends/${userToRemove.id}`,
		);

		expect(res.status).toBe(200);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Friend removed successfully",
				updatedFriendsList: expect.not.arrayContaining([
					userToRemove.id.toString(),
				]),
			}),
		);
	});

	it("should respond with 401 if user is not logged in", async () => {
		isUserUndefined = true;

		const res = await request(app).delete(
			`${apiPath}/users/me/friends/${userToRemove.id}`,
		);

		expect(res.status).toBe(401);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "You must be logged in to perform this action",
			}),
		);

		isUserUndefined = false;
	});

	it("should respond with 400 if user tries to unfriend themselves", async () => {
		const res = await request(app).delete(
			`${apiPath}/users/me/friends/${randomUser.id}`,
		);

		expect(res.status).toBe(400);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Cannot remove self as friend",
			}),
		);
	});

	it("should respond with 404 if user to unfriend is not found", async () => {
		const res = await request(app).delete(
			`${apiPath}/users/me/friends/${new ObjectId()}`,
		);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "User not found",
			}),
		);
	});

	it("should respond with 400 if user is not friends with the user they are trying to unfollow", async () => {
		try {
			await User.findByIdAndUpdate(randomUser.id, {
				$pull: { friends: userToRemove.id },
			});
			await User.findByIdAndUpdate(userToRemove.id, {
				$pull: { friends: randomUser.id },
			});
		} catch (error) {
			throw new Error(error);
		}

		const res = await request(app).delete(
			`${apiPath}/users/me/friends/${userToRemove.id}`,
		);

		expect(res.status).toBe(400);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Already not friends with user",
			}),
		);
	});

	it("should respond with 500 if an error occurs", async () => {
		jest.spyOn(User, "findById").mockImplementationOnce(() => {
			throw new Error("error");
		});

		const res = await request(app).delete(
			`${apiPath}/users/me/friends/${userToRemove.id}`,
		);

		expect(res.status).toBe(500);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "error",
			}),
		);
	});
});

describe("POST /users/me/friend-requests/:requestId/accept", () => {
	let userToAccept: IUser;
	let num = -1;

	beforeEach(async () => {
		num = getNextIndexArray(num, users.length);
		if (users[num].id === randomUser.id)
			num = getNextIndexArray(num, users.length);
		userToAccept = users[num];
		const userToAcceptId = userToAccept._id;

		try {
			randomUser = (await User.findByIdAndUpdate(
				randomUser._id,
				{
					$addToSet: { friendRequestsReceived: userToAcceptId },
				},
				{ new: true },
			)) as IUser;
			await User.findByIdAndUpdate(userToAcceptId, {
				$addToSet: { friendRequestsSent: randomUser._id },
			});
		} catch (error) {
			throw new Error(error);
		}
	});

	it("should respond with 200 if user successfully accepts a friend request", async () => {
		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${userToAccept.id}/accept`,
		);

		expect(res.status).toBe(200);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Friend request accepted successfully",
				myUpdatedFriendsList: expect.arrayContaining([
					userToAccept.id.toString(),
				]),
				myUpdatedFriendRequestsReceived: expect.not.arrayContaining([
					userToAccept.id.toString(),
				]),
				otherUserUpdatedFriendsList: expect.arrayContaining([
					randomUser.id.toString(),
				]),
				otherUserUpdatedFriendRequestsSent: expect.not.arrayContaining([
					randomUser.id.toString(),
				]),
			}),
		);
	});

	it("should respond with 401 if user is not logged in", async () => {
		isUserUndefined = true;

		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${userToAccept.id}/accept`,
		);

		expect(res.status).toBe(401);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "You must be logged in to perform this action",
			}),
		);

		isUserUndefined = false;
	});

	it("should respond with 404 if user to accept is not found", async () => {
		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${new ObjectId()}/accept`,
		);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "User not found",
			}),
		);
	});

	it("should respond with 404 and remove request if user to accept is deleted", async () => {
		try {
			await User.findByIdAndUpdate(randomUser._id, {
				$addToSet: { friendRequestsReceived: deletedUser._id },
			});
			await User.findByIdAndUpdate(deletedUser._id, {
				$addToSet: { friendRequestsSent: randomUser._id },
			});
		} catch (error) {
			throw new Error(error);
		}

		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${deletedUser._id}/accept`,
		);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "User not found",
			}),
		);
	});

	it("should respond with 400 if user is already a friend", async () => {
		try {
			await User.findByIdAndUpdate(randomUser._id, {
				$addToSet: { friends: userToAccept._id },
			});
			await User.findByIdAndUpdate(userToAccept._id, {
				$addToSet: { friends: randomUser._id },
			});
		} catch (error) {
			throw new Error(error);
		}

		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${userToAccept.id}/accept`,
		);

		expect(res.status).toBe(400);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Already friends with user",
			}),
		);
	});

	it("should respond with 404 if friend request is not found", async () => {
		const user = await createRandomUser();

		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${user.id}/accept`,
		);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Friend request not found",
			}),
		);
	});

	it("should respond with 500 if an error occurs", async () => {
		jest.spyOn(User, "findById").mockImplementationOnce(() => {
			throw new Error("error");
		});

		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${userToAccept.id}/accept`,
		);

		expect(res.status).toBe(500);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "error",
			}),
		);
	});
});

describe("POST /users/me/friend-requests/:requestId/reject", () => {
	let userToAccept: IUser;
	let num = -1;

	beforeEach(async () => {
		num = getNextIndexArray(num, users.length);
		if (users[num].id === randomUser.id)
			num = getNextIndexArray(num, users.length);
		userToAccept = users[num];
		const userToAcceptId = userToAccept._id;

		try {
			randomUser = (await User.findByIdAndUpdate(
				randomUser._id,
				{
					$addToSet: { friendRequestsReceived: userToAcceptId },
					$pull: { friends: userToAcceptId },
				},
				{ new: true },
			)) as IUser;
			await User.findByIdAndUpdate(userToAcceptId, {
				$addToSet: { friendRequestsSent: randomUser._id },
				$pull: { friends: randomUser._id },
			});
		} catch (error) {
			throw new Error(error);
		}
	});

	it("should respond with 200 if user successfully declines a friend request", async () => {
		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${userToAccept.id}/reject`,
		);

		expect(res.status).toBe(200);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Friend request rejected successfully",
				myUpdatedFriendsList: expect.not.arrayContaining([
					userToAccept.id.toString(),
				]),
				myUpdatedFriendRequestsReceived: expect.not.arrayContaining([
					userToAccept.id.toString(),
				]),
				otherUserUpdatedFriendsList: expect.not.arrayContaining([
					randomUser.id.toString(),
				]),
				otherUserUpdatedFriendRequestsSent: expect.not.arrayContaining([
					randomUser.id.toString(),
				]),
			}),
		);
	});

	it("should respond with 401 if user is not logged in", async () => {
		isUserUndefined = true;

		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${userToAccept.id}/reject`,
		);

		expect(res.status).toBe(401);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "You must be logged in to perform this action",
			}),
		);

		isUserUndefined = false;
	});

	it("should respond with 404 if user to reject is deleted", async () => {
		try {
			await User.findByIdAndUpdate(randomUser._id, {
				$addToSet: { friendRequestsReceived: deletedUser._id },
			});
			await User.findByIdAndUpdate(deletedUser._id, {
				$addToSet: { friendRequestsSent: randomUser._id },
			});
		} catch (error) {
			throw new Error(error);
		}

		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${deletedUser._id}/reject`,
		);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "User not found",
			}),
		);
	});

	it("should respond with 400 if user is already a friend", async () => {
		try {
			await User.findByIdAndUpdate(randomUser._id, {
				$addToSet: { friends: userToAccept._id },
			});
			await User.findByIdAndUpdate(userToAccept._id, {
				$addToSet: { friends: randomUser._id },
			});
		} catch (error) {
			throw new Error(error);
		}

		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${userToAccept.id}/reject`,
		);

		expect(res.status).toBe(400);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Already friends with user",
			}),
		);
	});

	it("should respond with 404 if user to reject is not found", async () => {
		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${new ObjectId()}/reject`,
		);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "User not found",
			}),
		);
	});

	it("should respond with 404 if friend request is not found", async () => {
		const user = await createRandomUser();

		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${user.id}/reject`,
		);

		expect(res.status).toBe(404);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Friend request not found",
			}),
		);
	});

	it("should respond with 500 if an error occurs", async () => {
		jest.spyOn(User, "findById").mockImplementationOnce(() => {
			throw new Error("error");
		});

		const res = await request(app).post(
			`${apiPath}/users/me/friend-requests/${userToAccept.id}/reject`,
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
