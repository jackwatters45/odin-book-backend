import express, { Request, Response } from "express";
import jwt from "jsonwebtoken";
import debug from "debug";
import { faker } from "@faker-js/faker";
import passport from "passport";
import request from "supertest";

import User from "../src/models/user.model";
import { IUser } from "../types/IUser";
import { apiPath, refreshTokenSecret } from "../src/config/envVariables";
import generateUser, { TestUser } from "./utils/generateUser";
import { configDb, disconnectFromDatabase } from "../src/config/database";
import configOtherMiddleware from "../src/middleware/otherConfig";
import configRoutes from "../src/routes";
import configAuthMiddleware from "../src/middleware/authConfig";
import {
	generateInvalidPassword,
	generatePassword,
} from "./utils/generatePassword";
import generateAndSendToken from "../src/utils/generateAndSendToken";
import generateRandomTokenEmailOrSms from "./utils/generateRandomTokenEmailOrSms";
import { userSignupFunctionGenerator } from "./utils/userSignupFunctionGenerator";
import clearDatabase from "../tools/populateDbs/utils/clearDatabase";
import { parseCookies } from "./utils/parseCookie";
import getUserWithoutPassword from "./utils/getUserWithoutPassword";

const log = debug("log:auth:test");

const app = express();

beforeAll(async () => {
	await configDb();
	await clearDatabase();
	configOtherMiddleware(app);
	configAuthMiddleware(app);
	configRoutes(app);
});

const signUpUser = userSignupFunctionGenerator();

describe("POST /signup", () => {
	let existingUser: TestUser;

	it("should create a new user", async () => {
		existingUser = generateUser();
		const res = await request(app)
			.post(`${apiPath}/auth/signup`)
			.send(existingUser)
			.expect(200);

		expect(res.body).toEqual({
			message: "Logged in successfully.",
			user: expect.objectContaining({
				_id: expect.any(String),
			}),
		});

		expect(res.headers).toHaveProperty("set-cookie");
		expect(res.headers["set-cookie"][0]).toMatch(/jwt=.+/);
		expect(res.headers["set-cookie"][1]).toMatch(/refreshToken=.+/);
	});

	it("should fail when the user already exists", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/signup`)
			.send(existingUser)
			.expect(400);

		expect(res.body.message).toBe("User with this email/phone already exists");
	});

	it("should fail when user is less than 13 years old", async () => {
		const today = new Date();
		const tenYearsAgo = new Date(today.setFullYear(today.getFullYear() - 10));
		const user = generateUser({ birthdayRef: tenYearsAgo });

		const res = await request(app)
			.post(`${apiPath}/auth/signup`)
			.send(user)
			.expect(400);

		expect(res.body.errors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					msg: "User must be at least 13 years old to register.",
				}),
			]),
		);
	});

	it("should fail when password is not min 8 chars and does not contain an uppercase, lowercase, number, special character ", async () => {
		const { password: _, ...userWithoutPassword } = generateUser();
		const res = await request(app)
			.post(`${apiPath}/auth/signup`)
			.send({
				...userWithoutPassword,
				password: generateInvalidPassword(),
			})
			.expect(400);

		expect(res.body.errors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					msg: "Password must contain at least one uppercase letter, one lowercase letter, one special character, one number, and be at least 8 characters long",
				}),
			]),
		);
	});

	it("should fail when required fields are not provided", async () => {
		const { firstName: _, ...userWithoutFirstName } = generateUser();
		const res = await request(app)
			.post(`${apiPath}/auth/signup`)
			.send(userWithoutFirstName)
			.expect(400);

		expect(res.body).toEqual({
			errors: expect.arrayContaining([
				expect.objectContaining({
					msg: "First name is required and should not be empty",
				}),
			]),
		});
	});

	it("should not fail when no pronouns provided", async () => {
		const { pronouns: _, ...userWithoutPronouns } = generateUser();
		const res = await request(app)
			.post(`${apiPath}/auth/signup`)
			.send(userWithoutPronouns)
			.expect(200);

		expect(res.body).toEqual({
			message: "Logged in successfully.",
			user: expect.objectContaining({
				_id: expect.any(String),
			}),
		});

		expect(res.headers).toHaveProperty("set-cookie");
		expect(res.headers["set-cookie"][0]).toMatch(/jwt=.+/);
	});

	it("should fail when invalid pronouns are provided", async () => {
		const user = generateUser({ pronouns: "invalidPronoun" });
		const res = await request(app)
			.post(`${apiPath}/auth/signup`)
			.send(user)
			.expect(400);

		expect(res.body.errors).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					msg: "Pronouns should be one of the following: they/them, she/her, he/him",
				}),
			]),
		);
	});

	it("should not fail when gender is provided", async () => {
		const user = generateUser({ gender: "other" });
		const res = await request(app)
			.post(`${apiPath}/auth/signup`)
			.send(user)
			.expect(200);

		expect(res.body).toEqual({
			message: "Logged in successfully.",
			user: expect.objectContaining({
				_id: expect.any(String),
				gender: "other",
			}),
		});
	});
});

describe("POST /login", () => {
	let validUser: { username: string; password: string };

	beforeEach(async () => {
		const { user, password } = await signUpUser();
		validUser = {
			username: user.email || (user.phoneNumber as string),
			password,
		};
	});

	it("should login a user", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/login`)
			.send(validUser)
			.expect(200);

		expect(res.body).toEqual({
			message: "Logged in successfully.",
			user: expect.objectContaining({
				_id: expect.any(String),
			}),
		});

		expect(res.headers).toHaveProperty("set-cookie");
		expect(res.headers["set-cookie"][0]).toMatch(/jwt=.+/);
	});

	it("should fail when the user does not exist", async () => {
		const { password } = validUser;
		const res = await request(app)
			.post(`${apiPath}/auth/login`)
			.send({
				username: faker.internet.email(),
				password,
			})
			.expect(401);

		expect(res.body.message).toBe("User with this email/phone not found");
	});

	it("should fail when the password is incorrect", async () => {
		const { username } = validUser;
		const res = await request(app)
			.post(`${apiPath}/auth/login`)
			.send({ username, password: generateInvalidPassword() })
			.expect(401);

		expect(res.body.message).toBe("Incorrect password");
	});

	it("should fail when user should be logging in with non-local strategy", async () => {
		const { user } = await signUpUser({
			facebookId: faker.string.alphanumeric(10),
			password: undefined,
		});

		const res = await request(app)
			.post(`${apiPath}/auth/login`)
			.send({
				username: user.email || user.phoneNumber,
				password: generatePassword(),
			})
			.expect(401);

		expect(res.body.message).toEqual(
			"User should be logging in with non-local strategy",
		);
	});
});

describe("POST /login-guest", () => {
	it("should login a guest", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/login-guest`)
			.expect(200);

		expect(res.body).toEqual({
			message: "Logged in successfully.",
			user: expect.objectContaining({
				_id: expect.any(String),
			}),
		});
	});
});

describe("POST /logout", () => {
	let user: IUser;
	let jwtToken: string;
	let refreshToken: string;

	beforeEach(async () => {
		try {
			user = (await signUpUser()).user;

			const payload = { id: user._id };
			jwtToken = user.generateJwtToken();
			refreshToken = jwt.sign(payload, refreshTokenSecret, { expiresIn: "7d" });

			user.refreshTokens.push(refreshToken);
			await user.save();
		} catch (err) {
			throw new Error(err);
		}
	});

	it("should clear the jwt cookie and return a successful response", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/logout`)
			.set("Cookie", [`jwt=${jwtToken}`, `refreshToken=${refreshToken}`])
			.expect(200);

		const cookies = parseCookies(res.headers["set-cookie"]);

		const jwtCookie = cookies[0];
		expect(jwtCookie).toHaveProperty("jwt", "");
		expect(jwtCookie["Expires"].getTime()).toBeLessThan(Date.now());

		const refreshTokenCookie = cookies[1];
		expect(refreshTokenCookie).toHaveProperty("refreshToken", "");
		expect(refreshTokenCookie["Expires"].getTime()).toBeLessThan(Date.now());

		expect(res.body).toEqual({ message: "User logged out successfully" });

		const updatedUser = (await User.findById(user._id)) as IUser;
		expect(updatedUser.refreshTokens).not.toContain(refreshToken);
	});

	it("should return 401 if no refresh token is provided", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/logout`)
			.set("Cookie", [`jwt=${jwtToken}`])
			.expect(401);

		expect(res.body).toEqual({ message: "Refresh token not found" });

		const updatedUser = (await User.findById(user._id)) as IUser;
		expect(updatedUser.refreshTokens).toContain(refreshToken);
	});

	it("should return 401 if the refresh token is invalid/is not found", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/logout`)
			.set("Cookie", [`jwt=${jwtToken}`, `refreshToken=${faker.string.uuid()}`])
			.expect(401);

		expect(res.body).toEqual({ message: "Invalid or expired token" });

		const updatedUser = (await User.findById(user._id)) as IUser;
		expect(updatedUser.refreshTokens).toContain(refreshToken);
	});
});

describe("GET /currentUser", () => {
	let user: IUser;
	let jwtToken: string;

	beforeEach(async () => {
		try {
			user = (await signUpUser()).user;

			jwtToken = user.generateJwtToken();
		} catch (err) {
			throw new Error(err);
		}
	});

	it("should return isAuthenticated as false if no JWT is provided", async () => {
		const res = await request(app)
			.get(`${apiPath}/auth/current-user`)
			.expect(200);

		expect(res.body).toEqual({
			isAuthenticated: false,
			message: "You must be logged in to perform this action",
		});
	});

	it("should return isAuthenticated as false if the user is not found", async () => {
		try {
			user.isDeleted = true;
			await user.save();
		} catch (err) {
			log(err);
		}

		const res = await request(app)
			.get(`${apiPath}/auth/current-user`)
			.set("Cookie", [`jwt=${jwtToken}`])
			.expect(401);

		expect(res.body).toEqual({
			isAuthenticated: false,
			message: "User not found",
		});
	});

	it("should return the user and isAuthenticated as true if the user is found", async () => {
		try {
			user.isDeleted = false;
			await user.save();
		} catch (err) {
			log(err);
		}

		const res = await request(app)
			.get(`${apiPath}/auth/current-user`)
			.set("Cookie", [`jwt=${jwtToken}`])
			.expect(200);

		expect(res.body).toEqual({
			user: expect.objectContaining({
				_id: user._id.toString(),
			}),
			isAuthenticated: true,
		});
	});

	it("should return an error if the JWT verification fails", async () => {
		const res = await request(app)
			.get(`${apiPath}/auth/current-user`)
			.set("Cookie", [`jwt=${faker.string.uuid()}`])
			.expect(401);

		expect(res.body).toEqual({
			isAuthenticated: false,
			message: expect.any(String),
		});
	});
});

describe("POST /refresh-token", () => {
	let user: IUser;
	let refreshToken: string;

	beforeEach(async () => {
		user = (await signUpUser()).user;

		const payload = { id: user._id };
		refreshToken = jwt.sign(payload, refreshTokenSecret, {
			expiresIn: "7d",
		});

		user.refreshTokens.push(refreshToken);
		await user.save();
	});

	it("should refresh the tokens and return a successful response", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/refresh-token`)
			.set("Cookie", [`refreshToken=${refreshToken}`])
			.expect(200);

		expect(res.body).toEqual({ message: "Refreshed token successfully." });

		const cookies = parseCookies(res.headers["set-cookie"]);

		const jwtCookie = cookies[0];
		expect(jwtCookie).toHaveProperty("jwt", expect.any(String));
		expect(jwtCookie["Expires"].getTime()).toBeGreaterThan(Date.now());

		const refreshTokenCookie = cookies[1];
		expect(refreshTokenCookie).toHaveProperty(
			"refreshToken",
			expect.any(String),
		);
		expect(refreshTokenCookie["Expires"].getTime()).toBeGreaterThan(Date.now());

		const updatedUser = (await User.findById(user._id)) as IUser;
		expect(updatedUser.refreshTokens).not.toContain(refreshToken);
		expect(updatedUser.refreshTokens).toHaveLength(1);
	});

	it("should return 401 if no refresh token is provided", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/refresh-token`)
			.expect(401);

		expect(res.body).toEqual({
			message: "Refresh token not found",
		});
	});

	it("should return 401 if the refresh token is invalid or the user does not exist", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/refresh-token`)
			.set("Cookie", [`refreshToken=${faker.string.uuid()}`])
			.expect(401);

		expect(res.body).toEqual({
			message: "Invalid or expired token",
		});
	});

	it("should return 401 if user associated with token does not exist", async () => {
		user.isDeleted = true;
		await user.save();

		const res = await request(app)
			.post(`${apiPath}/auth/refresh-token`)
			.set("Cookie", [`refreshToken=${refreshToken}`])
			.expect(401);

		expect(res.body).toEqual({
			message: "User not found or refresh token invalid",
		});
	});

	it("should return 500 if there is an error saving the user", async () => {
		user.isDeleted = false;
		await user.save();

		jest.spyOn(User.prototype, "save").mockImplementationOnce(() => {
			throw new Error("Test error saving user");
		});

		const res = await request(app)
			.post(`${apiPath}/auth/refresh-token`)
			.set("Cookie", [`refreshToken=${refreshToken}`])
			.expect(500);

		expect(res.body).toEqual({
			error: "Test error saving user",
			message: "An unexpected error occurred while refreshing jwt token.",
		});
	});
});

describe("POST /verify/code/:verificationToken", () => {
	let user: IUser;
	let jwtToken: string;

	beforeEach(async () => {
		const { token, tokenExpires, type } = generateRandomTokenEmailOrSms();

		try {
			user = (await signUpUser(undefined, type)).user;

			user.verification.token = token;
			user.verification.tokenExpires = tokenExpires;
			user.verification.type = type;
			user.verification.isVerified = false;
			await user.save();
		} catch (error) {
			throw new Error(error);
		}

		jwtToken = user.generateJwtToken();
	});

	it("returns 200 and verifies the user if verification code is valid and not expired", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/verify/code/${user.verification.token}`)
			.set("Cookie", [`jwt=${jwtToken}`])
			.expect(200);

		expect(res.body).toEqual({
			message: "Verification successful.",
		});

		const updatedUser = (await User.findById(user._id)) as IUser;
		expect(updatedUser.verification.isVerified).toBe(true);
		expect(updatedUser.verification.token).toBeUndefined();
		expect(updatedUser.verification.tokenExpires).toBeUndefined();
	});

	it("returns 400 if verification code is expired.", async () => {
		try {
			await User.findByIdAndUpdate(user._id, {
				"verification.tokenExpires": Date.now() - 10000,
			});
		} catch (error) {
			throw new Error(error);
		}

		const res = await request(app)
			.post(`${apiPath}/auth/verify/code/${user.verification.token}`)
			.set("Cookie", [`jwt=${jwtToken}`])
			.expect(400);

		expect(res.body).toEqual({
			message: "Verification code has expired. Please request a new one.",
		});

		const updatedUser = (await User.findById(user._id)) as IUser;
		expect(updatedUser.verification.isVerified).toBe(false);
		expect(updatedUser.verification.token).toBeUndefined();
		expect(updatedUser.verification.tokenExpires).toBeUndefined();
	});

	it("returns 400 if verification code is invalid", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/verify/code/${faker.string.uuid()}`)
			.set("Cookie", [`jwt=${jwtToken}`])
			.expect(400);

		expect(res.body).toEqual({
			message: "Invalid verification code.",
		});

		const updatedUser = (await User.findById(user._id)) as IUser;
		expect(updatedUser.verification.isVerified).toBe(false);
		expect(updatedUser.verification.token).toBe(user.verification.token);
		expect(updatedUser.verification.tokenExpires).not.toBeUndefined();
	});

	it("returns 401 if user is not logged in", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/verify/code/${user.verification.token}`)
			.expect(401);

		expect(res.body).toEqual({
			message: "You must be logged in to perform this action",
		});
	});

	it("returns 401 if user is already verified", async () => {
		try {
			await User.findByIdAndUpdate(user._id, {
				"verification.isVerified": true,
			});
		} catch (error) {
			throw new Error(error);
		}

		const res = await request(app)
			.post(`${apiPath}/auth/verify/code/${user.verification.token}`)
			.set("Cookie", [`jwt=${jwtToken}`])
			.expect(400);

		expect(res.body).toEqual({
			message: "User is already verified.",
		});

		const updatedUser = (await User.findById(user._id)) as IUser;
		expect(updatedUser.verification.isVerified).toBe(true);
		expect(updatedUser.verification.token).toBeUndefined();
		expect(updatedUser.verification.tokenExpires).toBeUndefined();
	});
});

describe("POST /verify/link/:verificationToken", () => {
	let user: IUser;

	beforeEach(async () => {
		const { token, tokenExpires, type } = generateRandomTokenEmailOrSms();
		const userData = new User({
			...generateUser(),
			verification: { token, tokenExpires, type, isVerified: false },
		});

		try {
			user = await userData.save();
		} catch (error) {
			console.error(error);
		}
	});

	it("returns 302 and verifies the user if verification link is valid and not expired", async () => {
		const res = await request(app)
			.get(`${apiPath}/auth/verify/link/${user.verification.token}`)
			.expect(302);

		expect(res.header.location).toBe("/login");

		const updatedUser = (await User.findById(user._id)) as IUser;
		expect(updatedUser.verification.isVerified).toBe(true);
		expect(updatedUser.verification.token).toBeUndefined();
		expect(updatedUser.verification.tokenExpires).toBeUndefined();
	});

	it("returns 400 if verification link is expired", async () => {
		user.verification.tokenExpires = Date.now() - 1000;
		await user.save();

		const res = await request(app)
			.get(`${apiPath}/auth/verify/link/${user.verification.token}`)
			.expect(400);

		expect(res.body.message).toBe(
			"Verification link has expired. Please request a new one.",
		);

		const updatedUser = (await User.findById(user._id)) as IUser;
		expect(updatedUser.verification.isVerified).toBe(false);
		expect(updatedUser.verification.token).toBeUndefined();
		expect(updatedUser.verification.tokenExpires).toBeUndefined();
	});

	it("returns 401 if verification link is invalid", async () => {
		const res = await request(app)
			.get(`${apiPath}/auth/verify/link/${faker.string.uuid()}`)
			.expect(401);

		expect(res.body.message).toBe("Invalid verification link.");

		const updatedUser = (await User.findById(user._id)) as IUser;
		expect(updatedUser.verification.isVerified).toBe(false);
		expect(updatedUser.verification.token).toBe(user.verification.token);
		expect(updatedUser.verification.tokenExpires).not.toBeUndefined();
	});

	it("returns 400 if user is already verified", async () => {
		user.verification.isVerified = true;
		await user.save();

		const res = await request(app)
			.get(`${apiPath}/auth/verify/link/${user.verification.token}`)
			.expect(400);

		expect(res.body.message).toBe("User is already verified.");

		const updatedUser = (await User.findById(user._id)) as IUser;
		expect(updatedUser.verification.isVerified).toBe(true);
		expect(updatedUser.verification.token).toBeUndefined();
		expect(updatedUser.verification.tokenExpires).toBeUndefined();
	});

	it("returns 401 if user does not exist or is deleted", async () => {
		user.isDeleted = true;
		await user.save();

		const res = await request(app)
			.get(`${apiPath}/auth/verify/link/${user.verification.token}`)
			.expect(401);

		expect(res.body.message).toBe("Invalid verification link.");

		const updatedUser = (await User.findById(user._id)) as IUser;
		expect(updatedUser.verification.isVerified).toBe(false);
		expect(updatedUser.verification.token).toBe(user.verification.token);
		expect(updatedUser.verification.tokenExpires).not.toBeUndefined();
	});

	it("returns 500 if an error occurs while saving the user", async () => {
		jest.spyOn(User.prototype, "save").mockImplementationOnce(() => {
			throw new Error("Test error saving user");
		});

		const res = await request(app)
			.get(`${apiPath}/auth/verify/link/${user.verification.token}`)
			.expect(500);

		expect(res.body).toEqual({
			message: "Test error saving user",
		});

		const updatedUser = (await User.findById(user._id)) as IUser;
		expect(updatedUser.verification.isVerified).toBe(false);
		expect(updatedUser.verification.token).toBe(user.verification.token);
		expect(updatedUser.verification.tokenExpires).not.toBeUndefined();
	});
});

jest.mock("../src/utils/generateAndSendToken", () => jest.fn());
describe("POST /verify/resend", () => {
	let user: IUser;
	let userIdType: "email" | "phoneNumber";
	let jwtToken: string;

	beforeEach(async () => {
		const { token, tokenExpires, type } = generateRandomTokenEmailOrSms();
		const baseUser = generateUser({ usernameType: type });

		userIdType = baseUser.username.includes("@") ? "email" : "phoneNumber";
		const userData = new User({
			...baseUser,
			[userIdType]: baseUser.username,
			verification: {
				token,
				tokenExpires,
				type,
				isVerified: false,
			},
		});

		try {
			user = await userData.save();
		} catch (error) {
			throw new Error(error);
		}

		jwtToken = user.generateJwtToken();
	});

	it("returns 200 and sends a new verification code to the user's email if user is logged in and not verified", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/verify/resend`)
			.set("Cookie", [`jwt=${jwtToken}`])
			.expect(200);

		expect(res.body).toEqual({
			message: `Verification code sent to user's ${userIdType}: ${
				user.email || user.phoneNumber
			}.`,
		});

		expect(generateAndSendToken).toHaveBeenCalledWith(
			getUserWithoutPassword(user),
			"verification",
			userIdType,
		);
		expect(generateAndSendToken).toHaveBeenCalledTimes(1);
	});

	it("returns 400 if user is already verified", async () => {
		user.verification.isVerified = true;
		await user.save();

		const res = await request(app)
			.post(`${apiPath}/auth/verify/resend`)
			.set("Cookie", [`jwt=${jwtToken}`])
			.expect(400);

		expect(res.body).toEqual({
			message: "User is already verified.",
		});
		expect(generateAndSendToken).toHaveBeenCalledTimes(0);
	});

	it("returns 401 if user is not logged in", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/verify/resend`)
			.expect(401);

		expect(res.body).toEqual({
			message: "You must be logged in to perform this action",
		});
		expect(generateAndSendToken).toHaveBeenCalledTimes(0);
	});

	it("returns 500 if an error occurs while generating and sending the token", async () => {
		(generateAndSendToken as jest.Mock).mockRejectedValueOnce(
			new Error("Something went wrong."),
		);

		const res = await request(app)
			.post(`${apiPath}/auth/verify/resend`)
			.set("Cookie", [`jwt=${jwtToken}`])
			.expect(500);

		expect(res.body).toEqual({
			message: "Something went wrong.",
		});

		expect(generateAndSendToken).toHaveBeenCalledWith(
			getUserWithoutPassword(user),
			"verification",
			userIdType,
		);
		expect(generateAndSendToken).toHaveBeenCalledTimes(1);
	});
});

jest.mock("../src/utils/generateAndSendToken", () => jest.fn());
describe("POST /forgot-password", () => {
	it("returns 200 and sends a reset password link to the user's email if user exists", async () => {
		const { user } = await signUpUser();

		const res = await request(app)
			.post(`${apiPath}/auth/forgot-password`)
			.send({
				userId: user.email || user.phoneNumber,
			})
			.expect(200);

		expect(res.body.message).toBe(
			"If the account exists, a reset password link was sent.",
		);

		expect(generateAndSendToken).toHaveBeenCalledTimes(1);
	});

	it("returns 400 if no userId is provided", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/forgot-password`)
			.send({})
			.expect(400);

		expect(res.body.errors).toEqual([
			{
				location: "body",
				msg: "Email or phone is required.",
				path: "userId",
				type: "field",
				value: "",
			},
		]);
	});

	it("returns 200 but doesn't send token if user does not exist", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/forgot-password`)
			.send({
				userId: faker.internet.email(),
			})
			.expect(200);
		expect(res.body.message).toBe(
			"If the account exists, a reset password link was sent.",
		);

		expect(generateAndSendToken).toHaveBeenCalledTimes(0);
	});

	it("returns 500 if an error occurs while generating and sending the token", async () => {
		const { user } = await signUpUser();

		(generateAndSendToken as jest.Mock).mockRejectedValueOnce(
			new Error("Something went wrong."),
		);

		const res = await request(app)
			.post(`${apiPath}/auth/forgot-password`)
			.send({
				userId: user.email || user.phoneNumber,
			})
			.expect(500);

		expect(res.body.message).toBe("Something went wrong.");

		expect(generateAndSendToken).toHaveBeenCalledTimes(1);
	});
});

describe("GET /reset-password/:resetToken", () => {
	let resetToken: string;

	beforeEach(async () => {
		const { token, tokenExpires, type } = generateRandomTokenEmailOrSms();
		await signUpUser({ resetPassword: { token, tokenExpires, type } }, type);
		resetToken = token;
	});

	it("returns 302 and a success message if the reset password token is valid", async () => {
		const res = await request(app)
			.get(`${apiPath}/auth/reset-password/${resetToken}`)
			.expect(302);

		expect(res.body.message).toBe("Reset password code is valid.");
	});

	it("returns 400 if the reset password token is invalid ", async () => {
		const res = await request(app)
			.get(`${apiPath}/auth/reset-password/${faker.string.uuid()}`)
			.expect(400);

		expect(res.body.message).toBe("Invalid reset password code.");
	});

	it("returns 400 if the reset password token is expired", async () => {
		const { token, type } = generateRandomTokenEmailOrSms();
		await signUpUser(
			{
				resetPassword: {
					token,
					tokenExpires: faker.date.past().getTime(),
					type,
				},
			},
			type,
		);

		const res = await request(app)
			.get(`${apiPath}/auth/reset-password/${token}`)
			.expect(400);

		expect(res.body.message).toBe(
			"Reset password code has expired. Please request a new one.",
		);
	});

	it("returns 500 if an error occurs while finding the user", async () => {
		jest.spyOn(User, "findOne").mockRejectedValueOnce(new Error("Test error"));

		const res = await request(app)
			.get(`${apiPath}/auth/reset-password/${resetToken}`)
			.expect(500);

		expect(res.body.message).toBe(
			"An error occurred while resetting your password.",
		);
	});
});

// // @route   POST /reset-password/:resetToken
// // @desc    Reset password
// // @access  Public
// export const postResetPassword = [
// 	body("newPassword")
// 		.notEmpty()
// 		.trim()
// 		.isLength({ min: 8 })
// 		.withMessage("Password should be at least 8 characters long")
// 		.matches(
// 			/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*?()])[A-Za-z\d!@#$%^&*?()]{8,}$/,
// 			"i",
// 		)
// 		.withMessage(
// 			"Password must contain at least one uppercase letter, one lowercase letter, one special character, one number, and be at least 8 characters long",
// 		),
// 	body("confirmPassword")
// 		.notEmpty()
// 		.trim()
// 		.custom((confirmPassword, { req }) => {
// 			if (confirmPassword !== req.body.newPassword) {
// 				throw new Error("Passwords do not match.");
// 			}
// 			return true;
// 		}),
// 	expressAsyncHandler(async (req, res) => {
// 		const errors = validationResult(req);
// 		if (!errors.isEmpty()) {
// 			res.status(400).json({ errors: errors.array() });
// 			return;
// 		}

// 		const { newPassword } = req.body;

// 		const { resetToken } = req.params;
// 		try {
// 			const user = await User.findOne({ "resetPassword.token": resetToken });
// 			if (!user) {
// 				res.status(400).json({ message: "Invalid reset password code." });
// 				return;
// 			}

// 			const { resetPassword } = user;
// 			if (
// 				resetPassword.tokenExpires &&
// 				resetPassword.tokenExpires < Date.now()
// 			) {
// 				res.status(400).json({
// 					message: "Reset password code has expired. Please request a new one.",
// 				});
// 				return;
// 			}

// 			user.password = newPassword;
// 			user.resetPassword.token = undefined;
// 			user.resetPassword.tokenExpires = undefined;

// 			await user.save();

// 			res.status(200).json({ message: "Password reset successfully." });
// 		} catch (err) {
// 			errorLog(err);
// 			res
// 				.status(500)
// 				.json({ message: "An error occurred while resetting your password." });
// 		}
// 	}),
// ];

describe("POST /reset-password:resetToken", () => {
	let user: IUser;
	let newPassword: string;
	let confirmPassword: string;

	beforeEach(async () => {
		const { token, tokenExpires, type } = generateRandomTokenEmailOrSms();

		try {
			const { user: newUser } = await signUpUser(
				{ resetPassword: { token, tokenExpires, type } },
				type,
			);
			user = newUser;
			newPassword = generatePassword();
			confirmPassword = newPassword;
		} catch (err) {
			throw new Error(err);
		}
	});

	it("returns 200 and resets the user's password if the reset password token is valid", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/reset-password/${user.resetPassword.token}`)
			.send({ newPassword, confirmPassword })
			.expect(200);

		expect(res.body.message).toBe("Password reset successfully.");

		const updatedUser = await User.findOne({ _id: user._id });
		if (!updatedUser) throw new Error("User not found.");

		const isMatch = await updatedUser.comparePassword(newPassword);
		expect(isMatch).toBe(true);
	});

	it("returns 400 if the reset password token is invalid ", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/reset-password/${faker.string.uuid()}`)
			.send({ newPassword, confirmPassword })
			.expect(400);

		expect(res.body.message).toBe("Invalid reset password code.");

		const updatedUser = await User.findOne({ _id: user._id });
		if (!updatedUser) throw new Error("User not found.");

		const isMatch = await updatedUser.comparePassword(newPassword);
		expect(isMatch).toBe(false);
	});

	it("returns 400 if the reset password token is expired", async () => {
		const { token, type } = generateRandomTokenEmailOrSms();
		const { user: userWithExpiredToken } = await signUpUser(
			{
				resetPassword: {
					token,
					tokenExpires: faker.date.past().getTime(),
					type,
				},
			},
			type,
		);

		const res = await request(app)
			.post(
				`${apiPath}/auth/reset-password/${userWithExpiredToken.resetPassword.token}`,
			)
			.send({ newPassword, confirmPassword })
			.expect(400);

		expect(res.body.message).toBe(
			"Reset password code has expired. Please request a new one.",
		);

		const updatedUser = await User.findOne({ _id: user._id });
		if (!updatedUser) throw new Error("User not found.");

		const isMatch = await updatedUser.comparePassword(newPassword);
		expect(isMatch).toBe(false);
	});

	it("returns 400 if the new password does not match the confirm password", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/reset-password/${user.resetPassword.token}`)
			.send({ newPassword, confirmPassword: newPassword + "1" })
			.expect(400);

		expect(res.body.errors).toEqual([
			{
				location: "body",
				msg: "Passwords do not match.",
				path: "confirmPassword",
				type: "field",
				value: newPassword + "1",
			},
		]);

		const updatedUser = await User.findOne({ _id: user._id });
		if (!updatedUser) throw new Error("User not found.");

		const isMatch = await updatedUser.comparePassword(newPassword);
		expect(isMatch).toBe(false);
	});

	it("returns 400 if the new password is not valid", async () => {
		const invalidPassword = generateInvalidPassword();
		const res = await request(app)
			.post(`${apiPath}/auth/reset-password/${user.resetPassword.token}`)
			.send({
				newPassword: invalidPassword,
				confirmPassword: invalidPassword,
			})

			.expect(400);
		expect(res.body.errors).toEqual([
			{
				location: "body",
				msg: "Password must contain at least one uppercase letter, one lowercase letter, one special character, one number, and be at least 8 characters long",
				path: "newPassword",
				type: "field",
				value: invalidPassword,
			},
		]);

		const updatedUser = await User.findOne({ _id: user._id });
		if (!updatedUser) throw new Error("User not found.");

		const isMatch = await updatedUser.comparePassword(newPassword);
		expect(isMatch).toBe(false);
	});

	it("returns 500 if an error occurs while resetting the password", async () => {
		jest
			.spyOn(User.prototype, "save")
			.mockRejectedValueOnce(new Error("Something went wrong."));

		const res = await request(app)
			.post(`${apiPath}/auth/reset-password/${user.resetPassword.token}`)
			.send({ newPassword, confirmPassword })

			.expect(500);
		expect(res.body.message).toBe(
			"An error occurred while resetting your password.",
		);

		const updatedUser = await User.findOne({ _id: user._id });
		if (!updatedUser) throw new Error("User not found.");

		const isMatch = await updatedUser.comparePassword(newPassword);
		expect(isMatch).toBe(false);
	});
});

describe("POST /change-password", () => {
	let userId: string;
	let jwtToken: string;

	let oldPassword: string;
	let newPassword: string;
	let confirmPassword: string;

	beforeEach(async () => {
		const { user, password } = await signUpUser();
		userId = user._id;

		oldPassword = password;
		newPassword = generatePassword();
		confirmPassword = newPassword;

		jwtToken = user.generateJwtToken();
	});

	it("returns 200 and changes the user's password if the current password is valid", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/change-password`)
			.set("Cookie", [`jwt=${jwtToken}`])
			.send({
				oldPassword,
				newPassword,
				confirmPassword,
			})
			.expect(200);

		expect(res.body).toEqual({
			message: "Password changed successfully.",
		});

		const updatedUser = await User.findOne({ _id: userId });
		if (!updatedUser) throw new Error("User not found.");

		const isMatch = await updatedUser.comparePassword(newPassword);
		expect(isMatch).toBe(true);
	});

	it("returns 400 if the old password is not correct", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/change-password`)
			.set("Cookie", [`jwt=${jwtToken}`])
			.send({
				oldPassword: oldPassword + "1",
				newPassword,
				confirmPassword,
			})
			.expect(400);

		expect(res.body).toEqual({ message: "Incorrect password." });

		const updatedUser = await User.findOne({ _id: userId });
		if (!updatedUser) throw new Error("User not found.");

		const isMatch = await updatedUser.comparePassword(newPassword);
		expect(isMatch).toBe(false);
	});

	it("returns 400 if the new password does not match the confirm password", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/change-password`)
			.set("Cookie", [`jwt=${jwtToken}`])
			.send({
				oldPassword,
				newPassword,
				confirmPassword: newPassword + "1",
			})
			.expect(400);

		expect(res.body).toEqual({
			errors: [
				{
					location: "body",
					msg: "Passwords do not match",
					path: "confirmPassword",
					value: newPassword + "1",
					type: "field",
				},
			],
		});

		const updatedUser = await User.findOne({ _id: userId });
		if (!updatedUser) throw new Error("User not found.");

		const isMatch = await updatedUser.comparePassword(newPassword);
		expect(isMatch).toBe(false);
	});

	it("returns 400 if the new password is not valid", async () => {
		const invalidPassword = generateInvalidPassword();

		const res = await request(app)
			.post(`${apiPath}/auth/change-password`)
			.set("Cookie", [`jwt=${jwtToken}`])
			.send({
				oldPassword,
				newPassword: invalidPassword,
				confirmPassword: invalidPassword,
			})
			.expect(400);

		expect(res.body).toEqual({
			errors: [
				{
					location: "body",
					msg: "Password must contain at least one uppercase letter, one lowercase letter, one special character, one number, and be at least 8 characters long",
					path: "newPassword",
					value: invalidPassword,
					type: "field",
				},
			],
		});

		const updatedUser = await User.findOne({ _id: userId });
		if (!updatedUser) throw new Error("User not found.");

		const isMatch = await updatedUser.comparePassword(newPassword);
		expect(isMatch).toBe(false);
	});

	it("returns 500 if an error occurs while changing the password", async () => {
		jest
			.spyOn(User.prototype, "save")
			.mockRejectedValueOnce(new Error("Something went wrong."));

		const res = await request(app)
			.post(`${apiPath}/auth/change-password`)
			.set("Cookie", [`jwt=${jwtToken}`])
			.send({
				oldPassword,
				newPassword,
				confirmPassword,
			})
			.expect(500);

		expect(res.body).toEqual({
			message: "An error occurred while changing your password.",
		});

		const updatedUser = await User.findOne({ _id: userId });
		if (!updatedUser) throw new Error("User not found.");

		const isMatch = await updatedUser.comparePassword(newPassword);
		expect(isMatch).toBe(false);
	});

	it("returns 401 if the user is not logged in", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/change-password`)
			.send({
				oldPassword,
				newPassword,
				confirmPassword,
			})
			.expect(401);

		expect(res.body).toEqual({
			message: "You must be logged in to perform this action",
		});
	});

	it("returns 400 if the user uses an alternative log in method", async () => {
		await User.findOneAndUpdate({ _id: userId }, { $set: { password: "" } });

		const res = await request(app)
			.post(`${apiPath}/auth/change-password`)
			.set("Cookie", [`jwt=${jwtToken}`])
			.send({
				oldPassword,
				newPassword,
				confirmPassword,
			})
			.expect(400);

		expect(res.body).toEqual({
			message: "User uses an alternative log in method.",
		});
	});

	it("returns 400 if the old password is empty", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/change-password`)
			.set("Cookie", [`jwt=${jwtToken}`])
			.send({
				oldPassword: "",
				newPassword,
				confirmPassword,
			})
			.expect(400);

		expect(res.body).toEqual({
			errors: [
				{
					location: "body",
					msg: "Invalid value",
					path: "oldPassword",
					value: "",
					type: "field",
				},
			],
		});
	});

	it("returns 400 if the new password is empty", async () => {
		const res = await request(app)
			.post(`${apiPath}/auth/change-password`)
			.set("Cookie", [`jwt=${jwtToken}`])
			.send({
				oldPassword,
				newPassword: "",
				confirmPassword: "",
			})
			.expect(400);

		expect(res.body).toEqual({
			errors: [
				{
					location: "body",
					msg: "Invalid value",
					path: "newPassword",
					type: "field",
					value: "",
				},
				{
					location: "body",
					msg: "Password should be at least 8 characters long",
					path: "newPassword",
					type: "field",
					value: "",
				},
				{
					location: "body",
					msg: "Password must contain at least one uppercase letter, one lowercase letter, one special character, one number, and be at least 8 characters long",
					path: "newPassword",
					type: "field",
					value: "",
				},
				{
					location: "body",
					msg: "Invalid value",
					path: "confirmPassword",
					type: "field",
					value: "",
				},
			],
		});
	});
});

describe("GET /login/facebook", () => {
	it("should return 302 and redirect to Facebook", async () => {
		jest
			.spyOn(passport, "authenticate")
			.mockImplementationOnce(() => (req: Request, res: Response) => {
				res.redirect("https://www.facebook.com");
			});

		const res = await request(app)
			.get(`${apiPath}/auth/login/facebook`)
			.expect(302);

		expect(res.headers.location).toContain("https://www.facebook.com");
	});
});

describe("GET /login/google", () => {
	it("should return 200 and redirect to Google", async () => {
		jest
			.spyOn(passport, "authenticate")
			.mockImplementationOnce(() => (req: Request, res: Response) => {
				res.redirect("https://www.google.com");
			});

		const res = await request(app)
			.get(`${apiPath}/auth/login/google`)
			.expect(302);

		expect(res.headers.location).toContain(
			"https://accounts.google.com/o/oauth2/",
		);
	});
});

describe("GET /login/github", () => {
	it("should return 200 and redirect to Github", async () => {
		jest
			.spyOn(passport, "authenticate")
			.mockImplementationOnce(() => (req: Request, res: Response) => {
				res.redirect("https://www.github.com");
			});

		const res = await request(app)
			.get(`${apiPath}/auth/login/github`)
			.expect(302);

		expect(res.headers.location).toContain(
			"https://github.com/login/oauth/authorize",
		);
	});
});

afterEach(() => jest.restoreAllMocks());
afterAll(async () => await disconnectFromDatabase());
