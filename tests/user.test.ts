// import express, { NextFunction } from "express";
// import request from "supertest";
// import { ObjectId } from "mongodb";
// import debug from "debug";
// import passport from "passport";
// import path from "path";

// import { disconnectFromDatabase, configDb } from "../src/config/database";
// import configOtherMiddleware from "../src/middleware/otherConfig";
// import configRoutes from "../src/routes";
// import configCloudinary from "../src/config/cloudinary";
// import configErrorMiddleware from "../src/middleware/errorConfig";
// import User, {IUser} from "../src/models/user.model";
// import Post, { IPost } from "../src/models/post.model";
// import { createRandomUser, createUser } from "../tools/populateDbs/users";
// import { apiPath } from "../src/config/envVariables";
// import { createPosts } from "../tools/populateDbs/posts/populatePosts";

// import generateUser, { TestUser } from "./utils/generateUser";
// import {
// 	generateInvalidPassword,
// 	generatePassword,
// } from "./utils/generatePassword";
// import createUsersAndSavedPosts from "../tools/populateDbs/createUsersAndPosts";
// import { addSavedPostsToUser } from "../tools/populateDbs/posts/utils/addSavedPosts";
// import clearDatabase from "../tools/populateDbs/utils/clearDatabase";
// import getPostIdsFromPosts from "./utils/getPostIdsFromPosts";
// import configAuth from "../src/middleware/authConfig";
// import getNextIndexArray from "../src/utils/getNextIndexArray";
// import IRequestWithUser from "../types/IRequestWithUser";

// const log = debug("log:user:test");

// const app = express();

// const numUsers = 6;
// const users: IUser[] = [];
// const posts: IPost[] = [];

// let randomUser: IUser;
// let adminUser: IUser;
// let standardUser: IUser;
// let deletedUser: IUser;

// let randomUserJwt: string;
// let adminUserJwt: string;
// let standardUserJwt: string;

// beforeAll(async () => {
// 	await configDb();
// 	await clearDatabase();
// 	await configAuth(app);
// 	configCloudinary();

// 	const usersAndPosts = await createUsersAndSavedPosts(numUsers - 2);
// 	posts.push(...usersAndPosts.posts);
// 	const postIds = getPostIdsFromPosts(posts);
// 	users.push(...usersAndPosts.users);

// 	randomUser = (await createUser(users, postIds, {
// 		userType: "user",
// 		posts,
// 		noFriends: true,
// 		noSavedPosts: true,
// 	})) as IUser;
// 	users.push(randomUser);
// 	randomUserJwt = randomUser.generateJwtToken();

// 	adminUser = (await createUser(users, postIds, {
// 		userType: "admin",
// 		posts,
// 	})) as IUser;
// 	users.push(adminUser);
// 	adminUserJwt = adminUser.generateJwtToken();

// 	standardUser = (await User.findById(posts[0].author)) as IUser;
// 	standardUserJwt = standardUser.generateJwtToken();

// 	deletedUser = (await createUser(users, postIds, {
// 		isDeleted: true,
// 	})) as IUser;

// 	users.sort((a, b) => {
// 		if (!a.createdAt || !b.createdAt) return 0;
// 		return b.createdAt.getTime() - a.createdAt.getTime();
// 	});

// 	configOtherMiddleware(app);
// 	configRoutes(app);

// 	configErrorMiddleware(app);
// }, 50000);

// describe("GET /users", () => {
// 	it("should return an array of users", async () => {
// 		const res = await request(app).get(`${apiPath}/users`).expect(200);

// 		expect(res.body.meta.total).toEqual(numUsers);
// 		expect(res.body.users.length).toEqual(numUsers);

// 		expect(res.body.users[0].id).toEqual(users[0].id);
// 		expect(res.body.users[numUsers - 1].id).toEqual(users[numUsers - 1].id);
// 	});

// 	it("should limit + offset the number of users returned when limit and offset query param is provided", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/users`)
// 			.query({ limit: 2, offset: 1 })
// 			.expect(200);

// 		expect(res.body.users.length).toEqual(2);
// 		expect(res.body.meta.total).toEqual(numUsers);

// 		expect(res.body.users[0].id).toEqual(users[1].id);
// 		expect(res.body.users[1].id).toEqual(users[2].id);
// 	});

// 	it("should return a 500 error if the database query fails", async () => {
// 		jest.spyOn(User, "find").mockImplementationOnce(() => {
// 			throw new Error("Database error");
// 		});

// 		const res = await request(app).get(`${apiPath}/users`).expect(500);

// 		expect(User.find).toHaveBeenCalled();
// 		expect(res.body.message).toEqual("Database error");
// 	});
// });

// describe("GET /users/:id", () => {
// 	it("should return the user details and posts by the given user id", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/users/${users[0].id}`)
// 			.expect(200);
// 		expect(res.body.user.id).toEqual(users[0].id);

// 		expect(Array.isArray(res.body.posts)).toBe(true);
// 		expect(Array.isArray(res.body.comments)).toBe(true);

// 		if (res.body.posts.length > 0)
// 			expect(res.body.posts[0].author).toEqual(res.body.user.id);

// 		if (res.body.comments.length > 0)
// 			expect(res.body.comments[0].author).toEqual(res.body.user.id);
// 	});

// 	it("should return a 403 error if the user is deleted", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/users/${deletedUser.id}`)
// 			.expect(403);
// 		expect(res.body.message).toEqual("This user has been deleted.");

// 		expect(res.body.posts).not.toBeDefined();
// 		expect(res.body.comments).not.toBeDefined();
// 	});

// 	it("should return a 500 error if the database query fails", async () => {
// 		jest.spyOn(User, "findById").mockImplementationOnce(() => {
// 			throw new Error("Database error");
// 		});

// 		const res = await request(app)
// 			.get(`${apiPath}/users/${users[0].id}`)
// 			.expect(500);
// 		expect(res.body.message).toEqual("Database error");

// 		expect(res.body.posts).not.toBeDefined();
// 		expect(res.body.comments).not.toBeDefined();
// 	});
// });

// describe("GET /users/:id/deleted", () => {
// 	it("should return the user details and posts by the given user id", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/users/${deletedUser.id}/deleted`)
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(200);

// 		expect(res.body).toEqual({
// 			user: expect.objectContaining({
// 				id: deletedUser.id,
// 				isDeleted: true,
// 			}),
// 			posts: expect.any(Array),
// 			comments: expect.any(Array),
// 		});

// 		if (res.body.posts.length > 0)
// 			expect(res.body.posts[0].author.toString()).toEqual(res.body.user.id);

// 		if (res.body.comments.length > 0)
// 			expect(res.body.comments[0].author.toString()).toEqual(res.body.user.id);
// 	});

// 	it("should return a 403 error if the user is not an admin", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/users/${deletedUser.id}/deleted`)
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(403);

// 		expect(res.body).toEqual({
// 			message: "Unauthorized",
// 		});
// 		expect(res.body.posts).not.toBeDefined();
// 	});

// 	it("should return a 401 error if the user is not logged in", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/users/${deletedUser.id}/deleted`)
// 			.expect(401);

// 		expect(res.body).toEqual({
// 			message: "You must be logged in to perform this action",
// 		});
// 	});

// 	it("should return a 500 error if the database query fails", async () => {
// 		jest.spyOn(Post, "find").mockImplementationOnce(() => {
// 			throw new Error("Database error");
// 		});

// 		const res = await request(app)
// 			.get(`${apiPath}/users/${deletedUser.id}/deleted`)
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(500);

// 		expect(res.body).toEqual({
// 			message: "Database error",
// 		});
// 	});
// });

// describe("POST /createUser", () => {
// 	let userData: TestUser;

// 	beforeAll(() => (userData = generateUser()));

// 	it("should create a new user", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/users`)
// 			.send({ ...userData })
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(201);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "User created successfully",
// 				user: expect.objectContaining({
// 					_id: expect.any(String),
// 					firstName: userData.firstName,
// 					lastName: userData.lastName,
// 					birthday: userData.birthday,
// 					pronouns: userData.pronouns,
// 				}),
// 			}),
// 		);
// 	});

// 	it("should fail when the user already exists", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/users`)
// 			.send({ ...userData })
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(400);

// 		expect(res.body).toEqual({
// 			message: "User with this email/phone already exists",
// 		});
// 	});

// 	it("should fail when password is not min 8 chars and does not contain an uppercase, lowercase, number, special character ", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/users`)
// 			.send({ ...generateUser(), password: generateInvalidPassword() })
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(400);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				errors: expect.arrayContaining([
// 					expect.objectContaining({
// 						msg: expect.stringContaining(
// 							"Password must contain at least one uppercase letter, one lowercase letter, one special character, one number, and be at least 8 characters long",
// 						),
// 					}),
// 				]),
// 			}),
// 		);
// 	});

// 	it("should fail when required fields are not provided", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/users`)
// 			.send({ ...generateUser(), firstName: undefined })
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(400);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				errors: expect.arrayContaining([
// 					expect.objectContaining({
// 						msg: expect.stringContaining("First name is required"),
// 					}),
// 				]),
// 			}),
// 		);
// 	});

// 	it("should not fail when no pronouns provided", async () => {
// 		const newUser = generateUser();
// 		const res = await request(app)
// 			.post(`${apiPath}/users`)
// 			.send({ ...newUser, pronouns: undefined })
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(201);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "User created successfully",
// 				user: expect.objectContaining({
// 					_id: expect.any(String),
// 					firstName: newUser.firstName,
// 					lastName: newUser.lastName,
// 					birthday: newUser.birthday,
// 				}),
// 			}),
// 		);
// 	});

// 	it("should fail when no user is provided", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/users`)
// 			.send({ ...userData })
// 			.expect(401);

// 		expect(res.body).toEqual({
// 			message: "You must be logged in to perform this action",
// 		});
// 	});

// 	it("should fail when user is not an admin", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/users`)
// 			.send({ ...userData })
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(403);
// 		expect(res.body).toEqual({
// 			message: "Unauthorized",
// 		});
// 	});

// 	it("should fail when database query fails", async () => {
// 		jest.spyOn(User.prototype, "save").mockImplementationOnce(() => {
// 			throw new Error("Database error");
// 		});

// 		const res = await request(app)
// 			.post(`${apiPath}/users`)
// 			.send({ ...generateUser() })
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(500);

// 		expect(res.body).toEqual({
// 			message: "Database error",
// 		});
// 	});
// });

// describe("PATCH /updateUserPassword/:id", () => {
// 	let validPassword: string;

// 	beforeEach(async () => {
// 		validPassword = generatePassword();
// 	});

// 	it("should update the user password", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/password`)
// 			.send({ newPassword: validPassword })
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(201);

// 		expect(res.body).toEqual({
// 			message: "Password updated successfully",
// 		});
// 	});

// 	it("should fail when new password does not meet requirements", async () => {
// 		const invalidPassword = generateInvalidPassword();
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/password`)
// 			.send({ newPassword: invalidPassword })
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(400);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({ errors: expect.any(Array) }),
// 		);
// 	});

// 	it("should fail when user is not found", async () => {
// 		const res = await request(app)
// 			.patch(
// 				`${apiPath}/users/updateUser/${new ObjectId().toString()}/password`,
// 			)
// 			.send({ newPassword: validPassword })
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(404);

// 		expect(res.body).toEqual({ message: "User not found" });
// 	});

// 	it("should fail when user is not logged in", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/password`)
// 			.send({ newPassword: validPassword })
// 			.expect(401);

// 		expect(res.body).toEqual({
// 			message: "You must be logged in to perform this action",
// 		});
// 	});

// 	it("should fail when user is not an admin", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${adminUser.id}/password`)
// 			.send({ newPassword: validPassword })
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(403);

// 		expect(res.body).toEqual({ message: "Unauthorized" });
// 	});

// 	it("should fail when database query fails", async () => {
// 		jest.spyOn(User.prototype, "save").mockImplementationOnce(() => {
// 			throw new Error("Database error");
// 		});

// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/password`)
// 			.send({ newPassword: validPassword })
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(500);

// 		expect(res.body).toEqual({ message: "Database error" });
// 	});
// });

// describe("PATCH /updateUser/:id/profile-photo", () => {
// 	let imagePath: string;

// 	beforeAll(() => {
// 		imagePath = path.join(__dirname, "./utils/test-photo.webp");
// 	});

// 	it("should update the user avatar photo when user is admin", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/profile-photo`)
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.attach("file", imagePath)
// 			.expect(201);

// 		expect(res.body).toEqual({
// 			message: "User profile photo updated successfully",
// 			user: expect.objectContaining({
// 				avatarUrl: expect.any(String),
// 			}),
// 		});
// 	});

// 	it("should update user avatar photo when user is not an admin but is editing their own profile", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/profile-photo`)
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.attach("file", imagePath)
// 			.expect(201);

// 		expect(res.body).toEqual({
// 			message: "User profile photo updated successfully",
// 			user: expect.objectContaining({
// 				avatarUrl: expect.any(String),
// 			}),
// 		});
// 	});

// 	it("should fail with 403 error when user is trying to edit someone else's profile and is not an admin", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${adminUser.id}/profile-photo`)
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.attach("file", imagePath)
// 			.expect(403);

// 		expect(res.body).toEqual({ message: "Unauthorized" });
// 	});

// 	it("should fail with 401 error when user is not logged in", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/profile-photo`)
// 			.attach("file", imagePath)
// 			.expect(401);

// 		expect(res.body).toEqual({
// 			message: "You must be logged in to perform this action",
// 		});
// 	});

// 	it("should fail with 404 error when user to edit is not found", async () => {
// 		const res = await request(app)
// 			.patch(
// 				`${apiPath}/users/updateUser/${new ObjectId().toString()}/profile-photo`,
// 			)
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.attach("file", imagePath)
// 			.expect(404);

// 		expect(res.body).toEqual({ message: "User not found" });
// 	});

// 	it("should fail with 400 error when no file is provided", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/profile-photo`)
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(400);

// 		expect(res.body).toEqual({ message: "No file provided" });
// 	});

// 	it("should fail when file is not an image (jpg, jpeg, png, gif, webp)", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/profile-photo`)
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.attach("file", path.join(__dirname, "./utils/test-file.txt"))
// 			.expect(400);

// 		expect(res.body).toEqual({
// 			message: "Invalid file type. Only image types are allowed.",
// 		});
// 	});

// 	it("should fail with 500 error when database query fails", async () => {
// 		jest.spyOn(User.prototype, "save").mockImplementationOnce(() => {
// 			throw new Error("Database error");
// 		});

// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/profile-photo`)
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.attach("file", imagePath)
// 			.expect(500);

// 		expect(res.body).toEqual({ message: "Database error" });
// 	});
// });

// describe("PATCH /updateUser/:id/cover-photo", () => {
// 	let imagePath: string;

// 	beforeAll(() => {
// 		imagePath = path.join(__dirname, "./utils/test-photo.webp");
// 	});

// 	it("should update the user cover photo when user is admin", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/cover-photo`)
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.attach("file", imagePath)
// 			.expect(201);

// 		expect(res.body).toEqual({
// 			message: "Cover photo updated successfully",
// 			user: expect.objectContaining({
// 				coverPhotoUrl: expect.any(String),
// 			}),
// 		});
// 	});

// 	it("should update user cover photo when user is not an admin but is editing their own profile", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/cover-photo`)
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.attach("file", imagePath)
// 			.expect(201);

// 		expect(res.body).toEqual({
// 			message: "Cover photo updated successfully",
// 			user: expect.objectContaining({
// 				coverPhotoUrl: expect.any(String),
// 			}),
// 		});
// 	});

// 	it("should fail with 403 error when user is trying to edit someone else's profile and is not an admin", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${adminUser.id}/cover-photo`)
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.attach("file", imagePath)
// 			.expect(403);

// 		expect(res.body).toEqual({ message: "Unauthorized" });
// 	});

// 	it("should fail with 401 error when user is not logged in", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/cover-photo`)
// 			.attach("file", imagePath)
// 			.expect(401);

// 		expect(res.body).toEqual({
// 			message: "You must be logged in to perform this action",
// 		});
// 	});

// 	it("should fail with 404 error when user to edit is not found", async () => {
// 		const res = await request(app)
// 			.patch(
// 				`${apiPath}/users/updateUser/${new ObjectId().toString()}/cover-photo`,
// 			)
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.attach("file", imagePath)
// 			.expect(404);

// 		expect(res.body).toEqual({ message: "User not found" });
// 	});

// 	it("should fail with 400 error when no file is provided", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/cover-photo`)
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(400);

// 		expect(res.body).toEqual({ message: "No file provided" });
// 	});

// 	it("should fail when file is not an image (jpg, jpeg, png, gif, webp)", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/cover-photo`)
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.attach("file", path.join(__dirname, "./utils/test-file.txt"))
// 			.expect(400);

// 		expect(res.body).toEqual({
// 			message: "Invalid file type. Only image types are allowed.",
// 		});
// 	});

// 	it("should fail with 500 error when database query fails", async () => {
// 		jest.spyOn(User.prototype, "save").mockImplementationOnce(() => {
// 			throw new Error("Database error");
// 		});

// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/cover-photo`)
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.attach("file", imagePath)
// 			.expect(500);

// 		expect(res.body).toEqual({ message: "Database error" });
// 	});
// });

// describe("PATCH /updateUser/:id/basic", () => {
// 	let userData: Partial<IUser>;

// 	beforeAll(() => {
// 		userData = {
// 			firstName: standardUser.firstName,
// 			lastName: standardUser.lastName,
// 			email: standardUser.email,
// 			phoneNumber: standardUser.phoneNumber,
// 			birthday: standardUser.birthday,
// 			pronouns: standardUser.pronouns,
// 			userType: standardUser.userType,
// 		};
// 	});

// 	it("should update the user", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/basic`)
// 			.send({ ...userData, firstName: "New First Name" })
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(201);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "User updated successfully",
// 				updatedUser: expect.any(Object),
// 			}),
// 		);
// 	});

// 	it("should fail when required fields are not provided", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/basic`)
// 			.send({ ...userData, firstName: undefined })
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(400);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				errors: expect.any(Array),
// 			}),
// 		);
// 	});

// 	it("should fail when user is not found", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${new ObjectId().toString()}/basic`)
// 			.send({ ...userData, firstName: "New First Name" })
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(404);

// 		expect(res.body).toEqual({ message: "User not found" });
// 	});

// 	it("should fail when user is not logged in", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/basic`)
// 			.send({ ...userData, firstName: "New First Name" })
// 			.expect(401);

// 		expect(res.body).toEqual({
// 			message: "You must be logged in to perform this action",
// 		});
// 	});

// 	it("should fail when user is not an admin", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${adminUser.id}/basic`)
// 			.send({ ...userData, firstName: "New First Name" })
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(403);

// 		expect(res.body).toEqual({ message: "Unauthorized" });
// 	});

// 	it("should update user when user is not an admin but is editing their own profile", async () => {
// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/basic`)
// 			.send({ ...userData, lastName: "New Last Name" })
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(201);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "User updated successfully",
// 				updatedUser: expect.any(Object),
// 			}),
// 		);
// 	});

// 	it("should fail when database query fails", async () => {
// 		jest.spyOn(User.prototype, "save").mockImplementationOnce(() => {
// 			throw new Error("Database error");
// 		});

// 		const res = await request(app)
// 			.patch(`${apiPath}/users/updateUser/${standardUser.id}/basic`)
// 			.send({ ...userData, firstName: "New First Name" })
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(500);
// 		expect(res.body).toEqual({ message: "Database error" });
// 	});
// });

// describe("GET /:id/posts", () => {
// 	let userPosts: IPost[];
// 	beforeAll(async () => {
// 		userPosts = await createPosts(3, { author: standardUser._id });
// 	});

// 	it("should return the user's posts", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/users/${standardUser.id}/posts`)
// 			.expect(200);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Posts retrieved successfully",
// 				posts: expect.arrayContaining([
// 					expect.objectContaining({
// 						content: expect.any(String),
// 						author: standardUser.id,
// 					}),
// 				]),
// 				meta: expect.objectContaining({
// 					total: expect.any(Number),
// 				}),
// 			}),
// 		);
// 	});

// 	it("should return the user's posts with pagination", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/users/${standardUser.id}/posts?limit=2&offset=1`)
// 			.expect(200);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Posts retrieved successfully",
// 				posts: expect.arrayContaining([
// 					expect.objectContaining({
// 						content: expect.any(String),
// 						author: standardUser.id,
// 					}),
// 				]),
// 				meta: expect.objectContaining({
// 					total: expect.any(Number),
// 				}),
// 			}),
// 		);

// 		expect(res.body.posts.length).toBe(2);
// 		expect(res.body.posts[0]._id.toString()).toBe(userPosts[1]._id.toString());
// 	});

// 	it("should return error when user is not found", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/users/${new ObjectId()}/posts`)
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "User not found",
// 			}),
// 		);
// 	});

// 	it("should return error when user has been deleted", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/users/${deletedUser._id}/posts`)
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "User has been deleted",
// 			}),
// 		);
// 	});

// 	it("should return empty array when user has no posts", async () => {
// 		const user = await createRandomUser();
// 		const res = await request(app)
// 			.get(`${apiPath}/users/${user.id}/posts`)
// 			.expect(200);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Posts retrieved successfully",
// 				posts: expect.arrayContaining([]),
// 				meta: expect.objectContaining({
// 					total: 0,
// 				}),
// 			}),
// 		);
// 	});

// 	it("should return error when database query fails", async () => {
// 		jest.spyOn(User, "findById").mockImplementationOnce(() => {
// 			throw new Error("Database error");
// 		});

// 		const res = await request(app)
// 			.get(`${apiPath}/users/${standardUser.id}/posts`)
// 			.expect(500);
// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Database error",
// 			}),
// 		);
// 	});
// });

// describe("GET /:id/friends", () => {
// 	it("should return the user's friends", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/users/${adminUser.id}/friends`)
// 			.expect(200);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Friends retrieved successfully",
// 				friends: expect.arrayContaining([
// 					expect.objectContaining({
// 						_id: expect.any(String),
// 						firstName: expect.any(String),
// 						lastName: expect.any(String),
// 						avatarUrl: expect.any(String),
// 					}),
// 				]),
// 			}),
// 		);
// 	});

// 	it("should return error when user is not found", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/users/${new ObjectId()}/friends`)
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "User not found",
// 			}),
// 		);
// 	});

// 	it("should return error when user has been deleted", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/users/${deletedUser._id}/friends`)
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "User has been deleted",
// 			}),
// 		);
// 	});

// 	it("should return empty array when user has no friends", async () => {
// 		const user = await createRandomUser();
// 		const res = await request(app)
// 			.get(`${apiPath}/users/${user.id}/friends`)
// 			.expect(200);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Friends retrieved successfully",
// 				friends: expect.arrayContaining([]),
// 			}),
// 		);
// 	});

// 	it("should return error when database query fails", async () => {
// 		jest.spyOn(User, "findById").mockImplementationOnce(() => {
// 			throw new Error("Database error");
// 		});

// 		const res = await request(app)
// 			.get(`${apiPath}/users/${new ObjectId()}/friends`)
// 			.expect(500);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Database error",
// 			}),
// 		);
// 	});
// });

// describe("GET /:id/saved-posts", () => {
// 	it("should return the user's saved posts", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/users/${standardUser.id}/saved-posts`)
// 			.set("Cookie", `jwt=${standardUserJwt}`)
// 			.expect(200);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Saved posts retrieved successfully",
// 				savedPosts: expect.arrayContaining([
// 					expect.objectContaining({
// 						_id: expect.any(String),
// 						content: expect.any(String),
// 					}),
// 				]),
// 				meta: expect.objectContaining({
// 					total: standardUser.savedPosts.length,
// 				}),
// 			}),
// 		);
// 	});

// 	it("should return the user's saved posts with pagination", async () => {
// 		if (standardUser.savedPosts.length < 3) {
// 			await addSavedPostsToUser(standardUser, getPostIdsFromPosts(posts));
// 		}

// 		const res = await request(app)
// 			.get(`${apiPath}/users/${standardUser.id}/saved-posts?limit=2&offset=1`)
// 			.set("Cookie", `jwt=${standardUserJwt}`)
// 			.expect(200);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Saved posts retrieved successfully",
// 				savedPosts: expect.arrayContaining([
// 					expect.objectContaining({
// 						_id: expect.any(String),
// 						content: expect.any(String),
// 					}),
// 				]),
// 				meta: expect.objectContaining({
// 					total: standardUser.savedPosts.length,
// 				}),
// 			}),
// 		);

// 		expect(res.body.savedPosts.length).toBe(2);
// 		expect(res.body.savedPosts[0]._id.toString()).toBe(
// 			standardUser.savedPosts[1].toString(),
// 		);
// 	});

// 	it("should return an empty array when user has no saved posts", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/users/${randomUser.id}/saved-posts`)
// 			.set("Cookie", `jwt=${randomUserJwt}`)
// 			.expect(200);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Saved posts retrieved successfully",
// 				savedPosts: expect.arrayContaining([]),
// 				meta: expect.objectContaining({
// 					total: 0,
// 				}),
// 			}),
// 		);
// 	});

// 	it("should return error when user is not signed in", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/users/${standardUser.id}/saved-posts`)
// 			.expect(401);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "You must be logged in to perform this action",
// 			}),
// 		);
// 	});

// 	it("should return error when user is not found", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/users/${new ObjectId()}/saved-posts`)
// 			.set("Cookie", `jwt=${adminUserJwt}`)
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "User not found",
// 			}),
// 		);
// 	});

// 	it("should return error when user has been deleted", async () => {
// 		const res = await request(app)
// 			.get(`${apiPath}/users/${deletedUser._id}/saved-posts`)
// 			.set("Cookie", `jwt=${adminUserJwt}`)
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "User not found",
// 			}),
// 		);
// 	});

// 	interface IRequestWithUser extends Request {
// 		user?: IUser;
// 	}

// 	it("should return error when database query fails", async () => {
// 		jest
// 			.spyOn(passport, "authenticate")
// 			.mockImplementationOnce((strategy, options) => {
// 				return async (
// 					req: IRequestWithUser,
// 					res: Response,
// 					next: NextFunction,
// 				) => {
// 					req.user = adminUser;
// 					next();
// 				};
// 			});

// 		jest.spyOn(User, "findOne").mockImplementationOnce(() => {
// 			throw new Error("Database error");
// 		});

// 		const res = await request(app)
// 			.get(`${apiPath}/users/${deletedUser._id}/saved-posts`)
// 			.set("Cookie", `jwt=${adminUserJwt}`)
// 			.expect(500);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Database error",
// 			}),
// 		);
// 	});
// });

// describe("POST /users/me/friend-requests/:id", () => {
// 	afterEach(async () => {
// 		await User.findByIdAndUpdate(standardUser._id, {
// 			$pull: { friendRequests: randomUser._id },
// 		});
// 		await User.findByIdAndUpdate(randomUser._id, {
// 			$pull: { friendRequests: standardUser._id },
// 		});
// 	});

// 	it("should respond with 200 if user successfully sends a friend request", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${randomUser.id}`)
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(200);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Friend request sent successfully",
// 			}),
// 		);
// 	});

// 	it("should respond with 401 if user is not logged in", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${standardUser.id}`)
// 			.expect(401);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "You must be logged in to perform this action",
// 			}),
// 		);
// 	});

// 	it("should respond with 400 if user tries to send a friend request to self", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${standardUser.id}`)
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(400);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "You cannot send a friend request to yourself",
// 			}),
// 		);
// 	});

// 	it("should respond with 404 if user to follow does not exist", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${new ObjectId()}`)
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "User not found",
// 			}),
// 		);
// 	});

// 	it("should respond with 404 if user to follow has been deleted", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${deletedUser._id}`)
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "User not found",
// 			}),
// 		);
// 	});

// 	it("should respond with 400 if user is already a friend", async () => {
// 		try {
// 			await User.findByIdAndUpdate(standardUser._id, {
// 				$push: { friends: randomUser._id },
// 			});
// 			await User.findByIdAndUpdate(randomUser._id, {
// 				$push: { friends: standardUser._id },
// 			});
// 			log("Added friend");
// 		} catch (error) {
// 			throw new Error(error);
// 		}

// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${randomUser.id}`)
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(400);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Already friends with user",
// 			}),
// 		);
// 	});

// 	it("should respond with 400 if user has already sent a friend request", async () => {
// 		try {
// 			await User.findByIdAndUpdate(standardUser._id, {
// 				$push: { friendRequestsSent: randomUser._id },
// 				$pull: { friends: randomUser._id },
// 			});
// 			await User.findByIdAndUpdate(randomUser._id, {
// 				$push: { friendRequestsReceived: standardUser._id },
// 				$pull: { friends: standardUser._id },
// 			});
// 			log("Added friend request");
// 		} catch (error) {
// 			throw new Error(error);
// 		}

// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${randomUser.id}`)
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(400);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Friend request already sent",
// 			}),
// 		);
// 	});

// 	it("should respond with 500 if database query fails", async () => {
// 		try {
// 			await User.findByIdAndUpdate(standardUser._id, {
// 				$pull: { friendRequestsSent: randomUser._id },
// 			});
// 			await User.findByIdAndUpdate(randomUser._id, {
// 				$pull: { friendRequestsReceived: standardUser._id },
// 			});
// 			log("Added friend request");
// 		} catch (error) {
// 			throw new Error(error);
// 		}

// 		jest.spyOn(User, "findByIdAndUpdate").mockImplementationOnce(() => {
// 			throw new Error("Database error");
// 		});

// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${randomUser.id}`)
// 			.set("Cookie", [`jwt=${standardUserJwt}`])
// 			.expect(500);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Database error",
// 			}),
// 		);
// 	});
// });

// describe("DELETE /users/me/friends/:friendId", () => {
// 	let userToRemove: IUser;
// 	beforeEach(async () => {
// 		userToRemove = standardUser;
// 		try {
// 			await User.findByIdAndUpdate(adminUser.id, {
// 				$addToSet: { friends: userToRemove.id },
// 			});
// 			await User.findByIdAndUpdate(userToRemove.id, {
// 				$push: { friends: adminUser.id },
// 			});
// 		} catch (error) {
// 			throw new Error(error);
// 		}
// 	});

// 	it("should respond with 200 if user successfully unfriends another user", async () => {
// 		const res = await request(app)
// 			.delete(`${apiPath}/users/me/friends/${userToRemove.id}`)
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(200);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Friend removed successfully",
// 				updatedFriendsList: expect.not.arrayContaining([
// 					userToRemove.id.toString(),
// 				]),
// 			}),
// 		);
// 	});

// 	it("should respond with 401 if user is not logged in", async () => {
// 		const res = await request(app)
// 			.delete(`${apiPath}/users/me/friends/${userToRemove.id}`)
// 			.expect(401);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "You must be logged in to perform this action",
// 			}),
// 		);
// 	});

// 	it("should respond with 400 if user tries to unfriend themselves", async () => {
// 		const res = await request(app)
// 			.delete(`${apiPath}/users/me/friends/${randomUser.id}`)
// 			.set("Cookie", [`jwt=${randomUserJwt}`])
// 			.expect(400);
// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Cannot remove self as friend",
// 			}),
// 		);
// 	});

// 	it("should respond with 404 if user to unfriend is not found", async () => {
// 		const res = await request(app)
// 			.delete(`${apiPath}/users/me/friends/${new ObjectId()}`)
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "User not found",
// 			}),
// 		);
// 	});

// 	it("should respond with 400 if user is not friends with the user they are trying to unfriend", async () => {
// 		try {
// 			await User.findByIdAndUpdate(randomUser.id, {
// 				$pull: { friends: userToRemove.id },
// 			});
// 			await User.findByIdAndUpdate(userToRemove.id, {
// 				$pull: { friends: randomUser.id },
// 			});
// 		} catch (error) {
// 			throw new Error(error);
// 		}

// 		const res = await request(app)
// 			.delete(`${apiPath}/users/me/friends/${userToRemove.id}`)
// 			.set("Cookie", [`jwt=${randomUserJwt}`])
// 			.expect(400);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Already not friends with user",
// 			}),
// 		);
// 	});

// 	it("should respond with 500 if an error occurs", async () => {
// 		jest.spyOn(User.prototype, "save").mockImplementationOnce(() => {
// 			throw new Error("error");
// 		});

// 		const res = await request(app)
// 			.delete(`${apiPath}/users/me/friends/${userToRemove.id}`)
// 			.set("Cookie", [`jwt=${adminUserJwt}`])
// 			.expect(500);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "error",
// 			}),
// 		);
// 	});
// });

// describe("POST /users/me/friend-requests/:requestId/accept", () => {
// 	let userToAccept: IUser;
// 	let num = -1;

// 	beforeEach(async () => {
// 		num = getNextIndexArray(num, users.length);
// 		if (users[num].id === randomUser.id)
// 			num = getNextIndexArray(num, users.length);
// 		userToAccept = users[num];
// 		const userToAcceptId = userToAccept._id;

// 		try {
// 			randomUser = (await User.findByIdAndUpdate(
// 				randomUser._id,
// 				{
// 					$addToSet: { friendRequestsReceived: userToAcceptId },
// 					$pull: { friends: userToAcceptId },
// 				},
// 				{ new: true },
// 			)) as IUser;
// 			await User.findByIdAndUpdate(userToAcceptId, {
// 				$addToSet: { friendRequestsSent: randomUser._id },
// 				$pull: { friends: randomUser._id },
// 			});
// 		} catch (error) {
// 			throw new Error(error);
// 		}
// 	});

// 	it("should respond with 200 if user successfully accepts a friend request", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${userToAccept.id}/accept`)
// 			.set("Cookie", [`jwt=${randomUserJwt}`])
// 			.expect(200);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Friend request accepted successfully",
// 				myUpdatedFriendsList: expect.arrayContaining([
// 					userToAccept.id.toString(),
// 				]),
// 				myUpdatedFriendRequestsReceived: expect.not.arrayContaining([
// 					userToAccept.id.toString(),
// 				]),
// 				otherUserUpdatedFriendsList: expect.arrayContaining([
// 					randomUser.id.toString(),
// 				]),
// 				otherUserUpdatedFriendRequestsSent: expect.not.arrayContaining([
// 					randomUser.id.toString(),
// 				]),
// 			}),
// 		);
// 	});

// 	it("should respond with 401 if user is not logged in", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${userToAccept.id}/accept`)
// 			.expect(401);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "You must be logged in to perform this action",
// 			}),
// 		);
// 	});

// 	it("should respond with 404 if user to accept is not found", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${new ObjectId()}/accept`)
// 			.set("Cookie", [`jwt=${randomUserJwt}`])
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "User not found",
// 			}),
// 		);
// 	});

// 	it("should respond with 404 and remove request if user to accept is deleted", async () => {
// 		try {
// 			await User.findByIdAndUpdate(randomUser._id, {
// 				$addToSet: { friendRequestsReceived: deletedUser._id },
// 			});
// 			await User.findByIdAndUpdate(deletedUser._id, {
// 				$addToSet: { friendRequestsSent: randomUser._id },
// 			});
// 		} catch (error) {
// 			throw new Error(error);
// 		}

// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${deletedUser._id}/accept`)
// 			.set("Cookie", [`jwt=${randomUserJwt}`])
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "User not found",
// 			}),
// 		);
// 	});

// 	it("should respond with 400 if user is already a friend", async () => {
// 		try {
// 			await User.findByIdAndUpdate(randomUser._id, {
// 				$addToSet: { friends: userToAccept._id },
// 			});
// 			await User.findByIdAndUpdate(userToAccept._id, {
// 				$addToSet: { friends: randomUser._id },
// 			});
// 		} catch (error) {
// 			throw new Error(error);
// 		}

// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${userToAccept.id}/accept`)
// 			.set("Cookie", [`jwt=${randomUserJwt}`])
// 			.expect(400);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Already friends with user",
// 			}),
// 		);
// 	});

// 	it("should respond with 404 if friend request is not found", async () => {
// 		const user = await createRandomUser();
// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${user.id}/accept`)
// 			.set("Cookie", [`jwt=${randomUserJwt}`])
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Friend request not found",
// 			}),
// 		);
// 	});

// 	it("should respond with 500 if an error occurs", async () => {
// 		jest.spyOn(User, "findByIdAndUpdate").mockImplementationOnce(() => {
// 			throw new Error("error");
// 		});

// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${userToAccept.id}/accept`)
// 			.set("Cookie", [`jwt=${randomUserJwt}`])
// 			.expect(500);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "error",
// 			}),
// 		);
// 	});
// });

// describe("POST /users/me/friend-requests/:requestId/reject", () => {
// 	let userToAccept: IUser;
// 	let num = -1;

// 	beforeEach(async () => {
// 		num = getNextIndexArray(num, users.length);
// 		if (users[num].id === randomUser.id)
// 			num = getNextIndexArray(num, users.length);
// 		userToAccept = users[num];
// 		const userToAcceptId = userToAccept._id;

// 		try {
// 			randomUser = (await User.findByIdAndUpdate(
// 				randomUser._id,
// 				{
// 					$addToSet: { friendRequestsReceived: userToAcceptId },
// 					$pull: { friends: userToAcceptId },
// 				},
// 				{ new: true },
// 			)) as IUser;
// 			await User.findByIdAndUpdate(userToAcceptId, {
// 				$addToSet: { friendRequestsSent: randomUser._id },
// 				$pull: { friends: randomUser._id },
// 			});
// 		} catch (error) {
// 			throw new Error(error.message);
// 		}
// 	});

// 	it("should respond with 200 if user successfully declines a friend request", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${userToAccept.id}/reject`)
// 			.set("Cookie", [`jwt=${randomUserJwt}`])
// 			.expect(200);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Friend request rejected successfully",
// 				myUpdatedFriendsList: expect.not.arrayContaining([
// 					userToAccept.id.toString(),
// 				]),
// 				myUpdatedFriendRequestsReceived: expect.not.arrayContaining([
// 					userToAccept.id.toString(),
// 				]),
// 				otherUserUpdatedFriendsList: expect.not.arrayContaining([
// 					randomUser.id.toString(),
// 				]),
// 				otherUserUpdatedFriendRequestsSent: expect.not.arrayContaining([
// 					randomUser.id.toString(),
// 				]),
// 			}),
// 		);
// 	});

// 	it("should respond with 401 if user is not logged in", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${userToAccept.id}/reject`)
// 			.expect(401);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "You must be logged in to perform this action",
// 			}),
// 		);
// 	});

// 	it("should respond with 404 if user to reject is deleted", async () => {
// 		try {
// 			await User.findByIdAndUpdate(randomUser._id, {
// 				$addToSet: { friendRequestsReceived: deletedUser._id },
// 			});
// 			await User.findByIdAndUpdate(deletedUser._id, {
// 				$addToSet: { friendRequestsSent: randomUser._id },
// 			});
// 		} catch (error) {
// 			throw new Error(error);
// 		}

// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${deletedUser._id}/reject`)
// 			.set("Cookie", [`jwt=${randomUserJwt}`])
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "User not found",
// 			}),
// 		);
// 	});

// 	it("should respond with 400 if user is already a friend", async () => {
// 		try {
// 			await User.findByIdAndUpdate(randomUser._id, {
// 				$addToSet: { friends: userToAccept._id },
// 			});
// 			await User.findByIdAndUpdate(userToAccept._id, {
// 				$addToSet: { friends: randomUser._id },
// 			});
// 		} catch (error) {
// 			throw new Error(error);
// 		}

// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${userToAccept.id}/reject`)
// 			.set("Cookie", [`jwt=${randomUserJwt}`])
// 			.expect(400);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Already friends with user",
// 			}),
// 		);
// 	});

// 	it("should respond with 404 if user to reject is not found", async () => {
// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${new ObjectId()}/reject`)
// 			.set("Cookie", [`jwt=${randomUserJwt}`])
// 			.expect(404);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "User not found",
// 			}),
// 		);
// 	});

// 	it("should respond with 404 if friend request is not found", async () => {
// 		const user = await createRandomUser();
// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${user.id}/reject`)
// 			.set("Cookie", [`jwt=${randomUserJwt}`])
// 			.expect(404);
// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "Friend request not found",
// 			}),
// 		);
// 	});

// 	it("should respond with 500 if an error occurs", async () => {
// 		jest.spyOn(User, "findByIdAndUpdate").mockImplementationOnce(() => {
// 			throw new Error("error");
// 		});

// 		const res = await request(app)
// 			.post(`${apiPath}/users/me/friend-requests/${userToAccept.id}/reject`)
// 			.set("Cookie", [`jwt=${randomUserJwt}`])
// 			.expect(500);

// 		expect(res.body).toEqual(
// 			expect.objectContaining({
// 				message: "error",
// 			}),
// 		);
// 	});
// });

// afterAll(async () => await disconnectFromDatabase());
