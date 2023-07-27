import express, { Request, Response } from "express";
import request from "supertest";
import { ObjectId } from "mongodb";
import { Query } from "mongoose";

import { disconnectFromDatabase, configDb } from "../src/config/database";
import configOtherMiddleware from "../src/middleware/otherConfig";
import configRoutes from "../src/routes";
import User, { IUser } from "../src/models/user-model/user.model";
import Post, { IPost } from "../src/models/post.model";
import {
	createRandomUser,
	createUsers,
} from "../tools/populateDbs/users/populateUsers";
import { apiPath } from "../src/config/envVariables";
import { createPosts } from "../tools/populateDbs/posts/populatePosts";
import {
	acceptFriendRequest,
	createUser,
	getDeletedUserById,
	getUserSavedPosts,
	rejectFriendRequest,
	sendFriendRequest,
	unfriendUser,
	updateUserBasicInfo,
	updateUserPassword,
} from "../src/controllers/user.controller";
import generateUser, { TestUser } from "./utils/generateUser";
import {
	generateInvalidPassword,
	generatePassword,
} from "./utils/generatePassword";

const app = express();

let users: IUser[] = [];
let posts: IPost[] = [];
let deletedUser: IUser;
const numUsers = 7;

beforeAll(async () => {
	await configDb();

	await User.deleteMany({});
	await Post.deleteMany({});
	users = (await createUsers(numUsers)) as IUser[];
	deletedUser = (await createRandomUser({ isDeleted: true })) as IUser;
	posts = await createPosts(numUsers + 1);

	configOtherMiddleware(app);
	configRoutes(app);
}, 20000);

describe("GET /users", () => {
	it("should return an array of users", async () => {
		const res = await request(app).get(`${apiPath}/users`);

		expect(res.statusCode).toEqual(200);
		expect(res.body).toHaveLength(numUsers);

		expect(res.body[0].id).toEqual(users[0].id);
		expect(res.body[1].id).toEqual(users[1].id);
		expect(res.body[2].id).toEqual(users[2].id);
	});

	it("should limit the number of users returned when limit query param is provided", async () => {
		const res = await request(app).get(`${apiPath}/users`).query({ limit: 2 });

		expect(res.statusCode).toEqual(200);
		expect(res.body).toHaveLength(2);

		expect(res.body[0].id).toEqual(users[0].id);
		expect(res.body[1].id).toEqual(users[1].id);
	});

	it("should return a 500 error if the database query fails", async () => {
		jest.spyOn(User, "find").mockImplementationOnce(() => {
			throw new Error("Database error");
		});

		const res = await request(app).get(`${apiPath}/users`);

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
	const adminUser = { userType: "admin" };

	let req: Request;
	let res: Response;
	const next = jest.fn();

	beforeEach(() => {
		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		} as unknown as Response;
		req = {
			user: adminUser,
			params: {
				id: deletedUser.id,
			},
		} as unknown as Request;
	});

	it("should return the user details and posts by the given user id", async () => {
		await getDeletedUserById[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({
			user: expect.objectContaining({
				id: deletedUser.id,
				isDeleted: true,
			}),
			posts: expect.any(Array),
			comments: expect.any(Array),
		});

		const responseJson = (res.json as jest.Mock).mock.calls[0][0];
		if (responseJson.posts.length > 0)
			expect(responseJson.posts[0].author.toString()).toEqual(
				responseJson.user.id,
			);

		if (responseJson.comments.length > 0)
			expect(responseJson.comments[0].author.toString()).toEqual(
				responseJson.user.id,
			);
	});

	it("should return a 403 error if the user is not an admin", async () => {
		req = { ...req, user: { userType: "user" } } as unknown as Request;

		await getDeletedUserById[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({
			message: "Unauthorized",
		});
	});

	it("should return a 401 error if the user is not logged in", async () => {
		req = {
			...req,
			user: null,
		} as unknown as Request;

		await getDeletedUserById[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			message: "User not logged in",
		});
	});

	it("should return a 500 error if the database query fails", async () => {
		jest.spyOn(User, "findById").mockImplementationOnce(() => {
			throw new Error("Database error");
		});

		await getDeletedUserById[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({
			message: "Database error",
		});
	});
});

describe("POST /createUser", () => {
	let existingUser: TestUser;

	let req: Request;
	let res: Response;
	const next = jest.fn();

	beforeEach(async () => {
		req = {
			body: generateUser(),
			user: { userType: "admin" },
		} as unknown as Request;
		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		} as unknown as Response;
	});

	it("should create a new user", async () => {
		existingUser = req.body;
		for (let i = 1; i < createUser.length; i++) {
			await createUser[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(201);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "User created successfully",
				user: expect.objectContaining({
					_id: expect.any(ObjectId),
					firstName: existingUser.firstName,
					lastName: existingUser.lastName,
					birthday: new Date(existingUser.birthday),
					pronouns: existingUser.pronouns,
				}),
			}),
		);
	});

	it("should fail when the user already exists", async () => {
		req.body = existingUser;
		for (let i = 1; i < createUser.length; i++) {
			await createUser[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			message: "User with this email/phone already exists",
		});
	});

	it("should fail when password is not min 8 chars and does not contain an uppercase, lowercase, number, special character ", async () => {
		req.body = { ...req.body, password: generateInvalidPassword() };
		for (let i = 1; i < createUser.length; i++) {
			await createUser[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				errors: expect.any(Array),
			}),
		);
	});

	it("should fail when required fields are not provided", async () => {
		req.body = { ...req.body, firstName: undefined };
		for (let i = 1; i < createUser.length; i++) {
			await createUser[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				errors: expect.any(Array),
			}),
		);
	});

	it("should not fail when no pronouns provided", async () => {
		req.body = { ...req.body, pronouns: undefined };

		for (let i = 1; i < createUser.length; i++) {
			await createUser[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(201);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "User created successfully",
				user: expect.objectContaining({
					_id: expect.any(ObjectId),
					firstName: req.body.firstName,
					lastName: req.body.lastName,
					birthday: new Date(req.body.birthday),
				}),
			}),
		);
	});

	it("should fail when no user is provided", async () => {
		req.user = undefined;
		for (let i = 1; i < createUser.length; i++) {
			await createUser[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			message: "User not logged in",
		});
	});

	it("should fail when user is not an admin", async () => {
		req.user = { userType: "user" };
		for (let i = 1; i < createUser.length; i++) {
			await createUser[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({
			message: "Unauthorized",
		});
	});

	it("should fail when database query fails", async () => {
		jest.spyOn(User, "findOne").mockImplementationOnce(() => {
			throw new Error("Database error");
		});

		for (let i = 1; i < createUser.length; i++) {
			await createUser[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({
			message: "Database error",
		});
	});
});

describe("PUT /updateUserPassword/:id", () => {
	let userNum = 0;
	let req: Request;
	let res: Response;
	const next = jest.fn();

	beforeEach(async () => {
		const user = users[userNum];
		const password = generatePassword();
		req = {
			params: { id: user._id },
			body: {
				newPassword: password,
				confirmPassword: password,
			},
			user: { userType: "admin" },
		} as unknown as Request;
		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		} as unknown as Response;

		userNum++;
	});

	it("should update the user password", async () => {
		for (let i = 1; i < updateUserPassword.length; i++) {
			await updateUserPassword[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(201);
		expect(res.json).toHaveBeenCalledWith({
			message: "Password updated successfully",
		});
	});

	it("should fail when passwords do not match", async () => {
		req.body = { ...req.body, confirmPassword: generatePassword() };
		for (let i = 1; i < updateUserPassword.length; i++) {
			await updateUserPassword[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({ errors: expect.any(Array) }),
		);
	});

	it("should fail when new password does not meet requirements", async () => {
		req.body = { ...req.body, newPassword: generateInvalidPassword() };
		for (let i = 1; i < updateUserPassword.length; i++) {
			await updateUserPassword[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({ errors: expect.any(Array) }),
		);
	});

	it("should fail when user is not found", async () => {
		req.params = { id: new ObjectId().toString() };
		for (let i = 1; i < updateUserPassword.length; i++) {
			await updateUserPassword[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
	});

	it("should fail when user is not logged in", async () => {
		req.user = undefined;
		for (let i = 1; i < updateUserPassword.length; i++) {
			await updateUserPassword[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ message: "User not logged in" });
	});

	it("should fail when user is not an admin", async () => {
		req.user = { userType: "user" };
		for (let i = 1; i < updateUserPassword.length; i++) {
			await updateUserPassword[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
	});

	it("should fail when database query fails", async () => {
		jest.spyOn(User, "findById").mockImplementationOnce(() => {
			throw new Error("Database error");
		});

		for (let i = 1; i < updateUserPassword.length; i++) {
			await updateUserPassword[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({ message: "Database error" });
	});
});

describe("PUT /updateUser/:id/basic", () => {
	let userNum = 0;
	let req: Request;
	let res: Response;
	const next = jest.fn();

	beforeEach(async () => {
		const user = users[userNum];
		req = {
			params: { id: user._id },
			body: {
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				phoneNumber: user.phoneNumber,
				birthday: user.birthday,
				pronouns: user.pronouns,
				userType: user.userType,
			},
			user: { userType: "admin", _id: undefined },
		} as unknown as Request;
		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		} as unknown as Response;

		userNum++;
	});

	it("should update the user", async () => {
		for (let i = 1; i < updateUserBasicInfo.length; i++) {
			await updateUserBasicInfo[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(201);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "User updated successfully",
				updatedUser: expect.any(Object),
			}),
		);
	});

	it("should fail when required fields are not provided", async () => {
		req.body = { ...req.body, firstName: undefined };
		for (let i = 1; i < updateUserBasicInfo.length; i++) {
			await updateUserBasicInfo[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				errors: expect.any(Array),
			}),
		);
	});

	it("should fail when user is not found", async () => {
		req.params = { id: new ObjectId().toString() };
		for (let i = 1; i < updateUserBasicInfo.length; i++) {
			await updateUserBasicInfo[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith({ message: "User not found" });
	});

	it("should fail when user is not logged in", async () => {
		req.user = undefined;
		for (let i = 1; i < updateUserBasicInfo.length; i++) {
			await updateUserBasicInfo[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ message: "No user logged in" });
	});

	it("should fail when user is not an admin", async () => {
		req.user = { userType: "user" };
		for (let i = 1; i < updateUserBasicInfo.length; i++) {
			await updateUserBasicInfo[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(403);
		expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
	});

	it("should update user when user is not an admin but is editing their own profile", async () => {
		req.user = { userType: "user", _id: req.params.id };
		for (let i = 1; i < updateUserBasicInfo.length; i++) {
			await updateUserBasicInfo[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(201);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "User updated successfully",
				updatedUser: expect.any(Object),
			}),
		);
	});

	it("should fail when database query fails", async () => {
		jest.spyOn(User, "findById").mockImplementationOnce(() => {
			throw new Error("Database error");
		});

		for (let i = 1; i < updateUserBasicInfo.length; i++) {
			await updateUserBasicInfo[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({ message: "Database error" });
	});
});

describe("GET /:id/posts", () => {
	let user: IUser;
	let userPosts: IPost[];

	beforeAll(async () => {
		user = (await createRandomUser()) as IUser;
		userPosts = await createPosts(3, { author: user._id });
	});

	it("should return the user's posts", async () => {
		const res = await request(app).get(`${apiPath}/users/${user.id}/posts`);

		expect(res.status).toBe(200);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Posts retrieved successfully",
				posts: expect.arrayContaining([
					expect.objectContaining({
						content: expect.any(String),
						author: user.id,
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
			`${apiPath}/users/${user.id}/posts?limit=2&offset=1`,
		);

		expect(res.status).toBe(200);
		expect(res.body).toEqual(
			expect.objectContaining({
				message: "Posts retrieved successfully",
				posts: expect.arrayContaining([
					expect.objectContaining({
						content: expect.any(String),
						author: user.id,
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
			`${apiPath}/users/${new ObjectId()}/posts`,
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
		const user = users[0];
		const res = await request(app).get(`${apiPath}/users/${user.id}/friends`);

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

const mockPosts = [
	{
		_id: new ObjectId(),
		content: "This is a mock post",
	},
	{
		_id: new ObjectId(),
		content: "This is a another mock post",
	},
];
describe("GET /:id/saved-posts", () => {
	let req: Request;
	let res: Response;
	const next = jest.fn();

	beforeAll(async () => {
		const mockUser = {
			_id: users[0]._id,
			savedPosts: [posts[0]._id, posts[1]._id],
		};

		jest.spyOn(User, "findById").mockImplementationOnce((id: string) => {
			return {
				exec: jest.fn().mockResolvedValue(mockUser),
				select: jest.fn().mockReturnThis(),
				populate: jest.fn().mockImplementationOnce(() => {
					return {
						exec: jest.fn().mockResolvedValueOnce({
							_id: id,
							savedPosts: mockPosts,
						}),
						select: jest.fn().mockReturnThis(),
					};
				}),
			} as unknown as Query<typeof User, typeof User>;
		});
	});

	beforeEach(async () => {
		req = {
			params: { id: users[0]._id },
			user: { ...users[0], savedPosts: [posts[0]._id, posts[1]._id] } as IUser,
		} as unknown as Request;
		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		} as unknown as Response;
	});

	it("should return the user's saved posts", async () => {
		await getUserSavedPosts[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Saved posts retrieved successfully",
				savedPosts: expect.arrayContaining([
					expect.objectContaining({
						_id: expect.any(ObjectId),
						content: expect.any(String),
					}),
				]),
				meta: expect.objectContaining({
					total: expect.any(Number),
				}),
			}),
		);
	});

	it("should return error when user is not found", async () => {
		req.params.id = String(new ObjectId());

		await getUserSavedPosts[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "User not found",
			}),
		);
	});

	it("should return error when user has been deleted", async () => {
		req.user = deletedUser;
		req.params.id = deletedUser._id;

		await getUserSavedPosts[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "User has been deleted",
			}),
		);
	});

	it("should return error when database query fails", async () => {
		jest.spyOn(User, "findById").mockImplementationOnce(() => {
			throw new Error("Database error");
		});

		await getUserSavedPosts[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Database error",
			}),
		);
	});
});

describe("POST /users/:id/friend-requests", () => {
	let req: Request;
	let res: Response;
	const next = jest.fn();

	let num = 0;
	let requestingUserId: string;

	beforeEach(() => {
		const nextUserIndex = num + 1 >= users.length ? 0 : num + 1;
		requestingUserId = users[num]._id;
		req = {
			user: users[num],
			params: { id: users[nextUserIndex]._id },
		} as unknown as Request;
		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		} as unknown as Response;

		num = nextUserIndex;
	});

	it("should respond with 200 if user successfully sends a friend request", async () => {
		try {
			await User.findByIdAndUpdate(requestingUserId, {
				$pull: { friends: req.params.id },
			});
			await User.findByIdAndUpdate(req.params.id, {
				$pull: { friends: requestingUserId },
			});
		} catch (error) {
			console.log(error);
		}

		await sendFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Friend request sent successfully",
			}),
		);
	});

	it("should respond with 401 if user is not logged in", async () => {
		req.user = undefined;

		await sendFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "You must be logged in to perform this action",
			}),
		);
	});

	it("should respond with 400 if user tries to send a friend request to self", async () => {
		req.params = { id: requestingUserId };

		await sendFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "You cannot send a friend request to yourself",
			}),
		);
	});

	it("should respond with 404 if user to follow does not exist", async () => {
		req.params.id = String(new ObjectId());

		await sendFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "User not found",
			}),
		);
	});

	it("should respond with 404 if user to follow has been deleted", async () => {
		req.params.id = deletedUser._id;

		await sendFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "User not found",
			}),
		);
	});

	it("should respond with 400 if user is already a friend", async () => {
		req.params.id = users[num]._id;

		try {
			await User.findByIdAndUpdate(users[num]._id, {
				$push: { friends: users[num - 1]._id },
			});
		} catch (error) {
			console.log(error);
		}

		await sendFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Already friends with user",
			}),
		);
	});

	it("should respond with 500 if database query fails", async () => {
		jest.spyOn(User, "findById").mockImplementationOnce(() => {
			throw new Error("Database error");
		});

		try {
			await User.findByIdAndUpdate(users[num]._id, {
				$pull: { friends: users[num - 1]._id },
			});
			await User.findByIdAndUpdate(users[num - 1]._id, {
				$pull: { friends: users[num]._id },
			});
		} catch (error) {
			console.log(error);
		}

		await sendFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Database error",
			}),
		);
	});
});

describe("DELETE /users/:id/friends/:friendId", () => {
	let req: Request;
	let res: Response;
	const next = jest.fn();

	let num = 0;

	beforeEach(() => {
		const nextUserIndex = num + 1 >= users.length ? 0 : num + 1;
		req = {
			user: users[num],
			params: { id: users[num]._id, friendId: users[nextUserIndex]._id },
		} as unknown as Request;
		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		} as unknown as Response;

		num = nextUserIndex;
	});

	it("should respond with 200 if user successfully unfriends another user", async () => {
		try {
			await User.findByIdAndUpdate(req.params.id, {
				$push: { friends: req.params.friendId },
			});
			await User.findByIdAndUpdate(req.params.friendId, {
				$push: { friends: req.params.id },
			});
		} catch (error) {
			console.log(error);
		}

		await unfriendUser[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Friend removed successfully",
			}),
		);
	});

	it("should respond with 401 if user is not logged in", async () => {
		req.user = undefined;

		await unfriendUser[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "You must be logged in to perform this action",
			}),
		);
	});

	it("should respond with 401 if user logged in is not the same as the :id provided", async () => {
		req.user = users[num + 1];

		await unfriendUser[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "You cannot perform this action",
			}),
		);
	});

	it("should respond with 400 if user tries to unfriend themselves", async () => {
		req.params.friendId = req.params.id;

		await unfriendUser[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Cannot remove self as friend",
			}),
		);
	});

	it("should respond with 404 if user to unfriend is not found", async () => {
		req.params.friendId = new ObjectId().toString();

		await unfriendUser[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "User not found",
			}),
		);
	});

	it("should respond with 400 if user is not friends with the user they are trying to unfollow", async () => {
		try {
			await User.findByIdAndUpdate(req.params.id, {
				$pull: { friends: req.params.friendId },
			});
			await User.findByIdAndUpdate(req.params.friendId, {
				$pull: { friends: req.params.id },
			});
		} catch (error) {
			console.log(error);
		}

		await unfriendUser[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "User already removed",
			}),
		);
	});

	it("should respond with 500 if an error occurs", async () => {
		jest.spyOn(User, "findById").mockImplementationOnce(() => {
			throw new Error("error");
		});

		await unfriendUser[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "error",
			}),
		);
	});
});

describe("POST /users/:id/friend-requests/:requestId/accept", () => {
	let req: Request;
	let res: Response;
	const next = jest.fn();

	let num = 0;

	beforeEach(() => {
		const nextUserIndex = num + 1 >= users.length ? 0 : num + 1;
		req = {
			user: users[num],
			params: { id: users[num]._id, requestId: users[nextUserIndex]._id },
		} as unknown as Request;
		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		} as unknown as Response;

		num = nextUserIndex;
	});

	it("should respond with 200 if user successfully accepts a friend request", async () => {
		try {
			await User.findByIdAndUpdate(users[num]._id, {
				$push: { friendRequestsReceived: req.params.requestId },
			});
			await User.findByIdAndUpdate(users[num - 1]._id, {
				$push: { friendRequestsSent: req.params.id },
			});
		} catch (error) {
			console.log(error);
		}

		await acceptFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Friend request accepted successfully",
			}),
		);
	});

	it("should respond with 401 if user is not logged in", async () => {
		req.user = undefined;

		await acceptFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "You must be logged in to perform this action",
			}),
		);
	});

	it("should respond with 401 if logged in user is not the user trying to accept the friend request", async () => {
		req.params.id = new ObjectId().toString();

		await acceptFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "You cannot perform this action",
			}),
		);
	});

	it("should respond with 404 if user to accept is not found", async () => {
		req.params.requestId = new ObjectId().toString();
		await acceptFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "User not found",
			}),
		);
	});

	it("should respond with 404 if user to accept is deleted", async () => {
		req.params.requestId = deletedUser._id;

		await acceptFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "User not found",
			}),
		);
	});

	it("should respond with 404 if friend request is not found", async () => {
		req.params.requestId = users[num]._id;

		await acceptFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Friend request not found",
			}),
		);
	});

	it("should respond with 500 if an error occurs", async () => {
		jest.spyOn(User, "findById").mockImplementationOnce(() => {
			throw new Error("error");
		});

		await acceptFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "error",
			}),
		);
	});
});

describe("POST /users/:id/friend-requests/:requestId/reject", () => {
	let req: Request;
	let res: Response;
	const next = jest.fn();

	let num = 0;

	beforeEach(() => {
		const nextUserIndex = num + 1 >= users.length ? 0 : num + 1;
		req = {
			user: users[num],
			params: { id: users[num]._id, requestId: users[nextUserIndex]._id },
		} as unknown as Request;
		res = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		} as unknown as Response;

		num = nextUserIndex;
	});

	it("should respond with 200 if user successfully declines a friend request", async () => {
		try {
			await User.findByIdAndUpdate(users[num]._id, {
				$push: { friendRequestsReceived: req.params.requestId },
			});
			await User.findByIdAndUpdate(users[num - 1]._id, {
				$push: { friendRequestsSent: req.params.id },
			});
		} catch (error) {
			console.log(error);
		}

		await rejectFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Friend request rejected successfully",
			}),
		);
	});

	it("should respond with 401 if user is not logged in", async () => {
		req.user = undefined;

		await rejectFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "You must be logged in to perform this action",
			}),
		);
	});

	it("should respond with 401 if user is not the same as the user to reject", async () => {
		req.params.id = new ObjectId().toString();

		await rejectFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "You cannot perform this action",
			}),
		);
	});

	it("should respond with 404 if user to reject is deleted", async () => {
		req.params.requestId = deletedUser._id;

		await rejectFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith(expect.objectContaining({}));
	});

	it("should respond with 404 if user to reject is not found", async () => {
		req.params.requestId = new ObjectId().toString();

		await rejectFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "User not found",
			}),
		);
	});

	it("should respond with 404 if friend request is not found", async () => {
		req.params.requestId = users[num]._id;

		await rejectFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(404);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Friend request not found",
			}),
		);
	});

	it("should respond with 500 if an error occurs", async () => {
		jest.spyOn(User, "findById").mockImplementationOnce(() => {
			throw new Error("error");
		});

		await rejectFriendRequest[1](req, res, next);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "error",
			}),
		);
	});
});

afterEach(() => jest.restoreAllMocks());
afterAll(async () => {
	await disconnectFromDatabase();
});
