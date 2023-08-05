import express, { NextFunction, Request, Response } from "express";
import User, { IUser } from "../src/models/user-model/user.model";
import { refreshTokenSecret } from "../src/config/envVariables";
import jwt from "jsonwebtoken";
import debug from "debug";
import {
	getCurrentUser,
	postChangePassword,
	postLogout,
	postRefreshToken,
	postResendVerificationCode,
	postVerifyCode,
} from "../src/controllers/auth.controller";
import { faker } from "@faker-js/faker";
import generateUser, { TestUser } from "./utils/generateUser";
import { configDb, disconnectFromDatabase } from "../src/config/database";
import configOtherMiddleware from "../src/middleware/otherConfig";
import configRoutes from "../src/routes";
import configAuthMiddleware from "../src/middleware/authConfig";
import request from "supertest";
import {
	generateInvalidPassword,
	generatePassword,
} from "./utils/generatePassword";
import generateAndSendToken from "../src/utils/generateAndSendToken";
import generateRandomTokenEmailOrSms from "./utils/generateRandomTokenEmailOrSms";
import passport from "passport";
import { userSignupFunctionGenerator } from "./utils/userSignupFunctionGenerator";
import clearDatabase from "../tools/populateDbs/utils/clearDatabase";

const log = debug("log:auth:test");

const app = express();

beforeAll(async () => {
	await configDb();
	await clearDatabase();
	configOtherMiddleware(app);
	configAuthMiddleware(app);
	configRoutes(app);
});

// TODO fix ones with todo
// TODO clean up mock bs

const signUpUser = userSignupFunctionGenerator();

describe("POST /signup", () => {
	let existingUser: TestUser;

	it("should create a new user", async () => {
		existingUser = generateUser();
		const res = await request(app)
			.post("/api/v1/auth/signup")
			.send(existingUser);

		expect(res.statusCode).toEqual(200);
		expect(res.body).toHaveProperty("message");

		expect(res.body).toHaveProperty("user");
		expect(res.body.user).toHaveProperty("_id");

		expect(res.headers).toHaveProperty("set-cookie");
		expect(res.headers["set-cookie"][0]).toMatch(/jwt=.+/);
		expect(res.headers["set-cookie"][1]).toMatch(/refreshToken=.+/);
	});

	it("should fail when the user already exists", async () => {
		const res = await request(app)
			.post("/api/v1/auth/signup")
			.send(existingUser);

		expect(res.statusCode).toEqual(400);

		expect(res.body).toHaveProperty("message");
		expect(res.body.message).toEqual(
			"User with this email/phone already exists",
		);
	});

	it("should fail when password is not min 8 chars and does not contain an uppercase, lowercase, number, special character ", async () => {
		const { password: _, ...userWithoutPassword } = generateUser();
		const res = await request(app)
			.post("/api/v1/auth/signup")
			.send({
				...userWithoutPassword,
				password: generateInvalidPassword(),
			});

		expect(res.statusCode).toEqual(400);
		expect(res.body).toHaveProperty("errors");
	});

	it("should fail when required fields are not provided", async () => {
		const { firstName: _, ...userWithoutFirstName } = generateUser();
		const res = await request(app)
			.post("/api/v1/auth/signup")
			.send(userWithoutFirstName);

		expect(res.statusCode).toEqual(400);
		expect(res.body).toHaveProperty("errors");
	});

	it("should not fail when no pronouns provided", async () => {
		const { pronouns: _, ...userWithoutPronouns } = generateUser();
		const res = await request(app)
			.post("/api/v1/auth/signup")
			.send(userWithoutPronouns);

		expect(res.statusCode).toEqual(200);
		expect(res.body).toHaveProperty("message");

		expect(res.body).toHaveProperty("user");
		expect(res.body.user).toHaveProperty("_id");

		expect(res.headers).toHaveProperty("set-cookie");
		expect(res.headers["set-cookie"][0]).toMatch(/jwt=.+/);
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
		const res = await request(app).post("/api/v1/auth/login").send(validUser);

		expect(res.statusCode).toEqual(200);
		expect(res.body).toHaveProperty("message");

		expect(res.body).toHaveProperty("user");
		expect(res.body.user).toHaveProperty("_id");

		expect(res.headers).toHaveProperty("set-cookie");
		expect(res.headers["set-cookie"][0]).toMatch(/jwt=.+/);
	});

	it("should fail when the user does not exist", async () => {
		const { password } = validUser;
		const res = await request(app).post("/api/v1/auth/login").send({
			username: faker.internet.email(),
			password,
		});

		expect(res.statusCode).toEqual(401);
		expect(res.body).toHaveProperty("message");
		expect(res.body.message).toEqual("User with this email/phone not found");
	});

	it("should fail when the password is incorrect", async () => {
		const { username } = validUser;
		const res = await request(app)
			.post("/api/v1/auth/login")
			.send({ username, password: generateInvalidPassword() });

		expect(res.statusCode).toEqual(401);
		expect(res.body).toHaveProperty("message");
		expect(res.body.message).toEqual("Incorrect password");
	});

	it("should fail when user should be logging in with non-local strategy", async () => {
		const { user } = await signUpUser({
			facebookId: faker.string.alphanumeric(10),
			password: undefined,
		});

		const res = await request(app)
			.post("/api/v1/auth/login")
			.send({
				username: user.email || user.phoneNumber,
				password: generatePassword(),
			});

		expect(res.statusCode).toEqual(401);
		expect(res.body).toHaveProperty("message");
		expect(res.body.message).toEqual(
			"User should be logging in with non-local strategy",
		);
	});
});

describe("POST /login-guest", () => {
	afterEach(() => jest.restoreAllMocks());

	it("should login a guest", async () => {
		const res = await request(app).post("/api/v1/auth/login-guest");

		expect(res.statusCode).toEqual(200);
		expect(res.body).toHaveProperty("message");

		expect(res.body).toHaveProperty("user");
		expect(res.body.user).toHaveProperty("_id");
	});
});

// TODO
describe("POST /logout", () => {
	let res: Response;
	const req = { cookies: {} } as Request;
	const next = jest.fn() as NextFunction;

	let user: IUser;
	let refreshToken: string;

	beforeEach(async () => {
		res = {
			clearCookie: jest.fn(),
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		} as unknown as Response;

		user = (await signUpUser()).user;

		const expires = { expiresIn: "7d" };
		refreshToken = jwt.sign({ id: user._id }, refreshTokenSecret, expires);

		req.cookies.refreshToken = refreshToken;
		user.refreshTokens.push(refreshToken);

		await user.save();
	});

	it("should clear the jwt cookie and return a successful response", async () => {
		await postLogout(req, res, next);

		expect(res.clearCookie).toHaveBeenCalledWith("jwt", {
			httpOnly: true,
			// secure: true,
			// sameSite: 'none',
		});

		expect(res.clearCookie).toHaveBeenCalledWith("refreshToken", {
			httpOnly: true,
			// secure: true,
			// sameSite: 'none',
		});

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({
			message: "User logged out successfully",
		});

		const updatedUser = (await User.findById(user._id)) as IUser;
		expect(updatedUser.refreshTokens).not.toContain(refreshToken);
	});

	it("should return 401 if no refresh token is provided", async () => {
		req.cookies.refreshToken = undefined;
		await postLogout(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			message: "Refresh token not found",
		});

		const updatedUser = (await User.findById(user._id)) as IUser;
		expect(updatedUser.refreshTokens).toContain(refreshToken);
	});

	it("should return 401 if the refresh token is invalid/is not found", async () => {
		req.cookies.refreshToken = faker.string.uuid();
		await postLogout(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			message: "Invalid or expired token",
		});

		const updatedUser = (await User.findById(user._id)) as IUser;
		expect(updatedUser.refreshTokens).toContain(refreshToken);
	});
});

// TODO
describe("GET /currentUser", () => {
	jest.mock("jsonwebtoken");

	let res: Response;
	const req = { cookies: {} } as Request;
	const next = jest.fn() as NextFunction;

	beforeEach(() => {
		res = {
			clearCookie: jest.fn(),
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		} as unknown as Response;
	});

	it("should return isAuthenticated as false if no JWT is provided", async () => {
		req.cookies = {};

		await getCurrentUser(req, res, next);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({
			isAuthenticated: false,
			message: "No user logged in",
		});
	});

	it("should return isAuthenticated as false if the user is not found", async () => {
		req.cookies = { jwt: "someJwt" };
		const mockVerify = jest.fn().mockReturnValue({ id: "someUserId" });
		jest
			.spyOn(jwt, "verify")
			.mockImplementation((...args) => mockVerify(...args));
		jest.spyOn(User, "findById").mockResolvedValue(null);
		await getCurrentUser(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			isAuthenticated: false,
			message: "User not found",
		});
	});

	it("should return the user and isAuthenticated as true if the user is found", async () => {
		req.cookies = { jwt: "someJwt" };
		const mockVerify = jest.fn().mockReturnValue({ id: "someUserId" });
		jest
			.spyOn(jwt, "verify")
			.mockImplementation((...args) => mockVerify(...args));
		const user = { _id: "someUserId", email: "test@example.com" };
		jest.spyOn(User, "findById").mockResolvedValue(user);

		await getCurrentUser(req, res, next);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({
			user,
			isAuthenticated: true,
		});
	});

	it("should return an error if the JWT verification fails", async () => {
		req.cookies = { jwt: "someJwt" };
		jest.spyOn(jwt, "verify").mockImplementation(() => {
			throw new Error("JWT verification failed");
		});

		await getCurrentUser(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			isAuthenticated: false,
			message: "JWT verification failed",
		});
	});
});

// TODO
describe("POST /refresh-token", () => {
	let res: Response;
	const req = { cookies: {} } as Request;
	const next = jest.fn() as NextFunction;

	let user: IUser;
	let refreshToken: string;

	beforeEach(async () => {
		user = (await signUpUser()).user;

		res = {
			clearCookie: jest.fn(),
			cookie: jest.fn(),
			status: jest.fn().mockReturnThis(),
			json: jest.fn(),
		} as unknown as Response;

		const payload = { id: user._id };
		refreshToken = jwt.sign(payload, refreshTokenSecret, {
			expiresIn: "7d",
		});

		req.cookies.refreshToken = refreshToken;

		user.refreshTokens.push(refreshToken);
		await user.save();
	});

	it("should refresh the tokens and return a successful response", async () => {
		await postRefreshToken(req, res, next);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({
			message: "Refreshed token successfully.",
		});

		expect(res.cookie).toHaveBeenCalledWith("jwt", expect.any(String), {
			maxAge: 3600000,
			httpOnly: true,
		});
		expect(res.cookie).toHaveBeenCalledWith(
			"refreshToken",
			expect.any(String),
			{
				maxAge: 604800000,
				httpOnly: true,
			},
		);

		const updatedUser = (await User.findById(user._id)) as IUser;
		expect(updatedUser.refreshTokens).not.toContain(refreshToken);
		expect(updatedUser.refreshTokens).toHaveLength(1);
	});

	it("should return 401 if no refresh token is provided", async () => {
		req.cookies = {};

		await postRefreshToken(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			message: "Refresh token not found",
		});
	});

	it("should return 401 if the refresh token is invalid or the user does not exist", async () => {
		req.cookies.refreshToken = faker.string.uuid();

		await postRefreshToken(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			message: "Invalid or expired token",
		});
	});

	it("should return 401 if user associated with token does not exist", async () => {
		jest.spyOn(User, "findOne").mockImplementation(() => {
			throw new Error();
		});

		await postRefreshToken(req, res, next);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			message: "Invalid or expired token",
		});
	});

	it("should return 500 if there is an error saving the user", async () => {
		jest
			.spyOn(User.prototype, "save")
			.mockRejectedValue(new Error("Test error saving user"));

		await postRefreshToken(req, res, next);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({
			error: "Test error saving user",
			message: "An unexpected error occurred while refreshing jwt token.",
		});
	});
});

// TODO
describe("POST /verify/code/:verificationToken", () => {
	it("returns 200 and verifies the user if verification code is valid and not expired", async () => {
		const { token, tokenExpires, type } = generateRandomTokenEmailOrSms();
		const req = {
			user: {
				verification: { token, tokenExpires, type, isVerified: false },
				save: jest.fn(),
			},
			params: { verificationToken: token },
		};
		const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

		await postVerifyCode[1](req, res);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({
			message: "Verification successful.",
		});
		expect(req.user.save).toHaveBeenCalled();
		expect(req.user.verification.isVerified).toBe(true);
	});

	it("returns 400 if verification code is expired.", async () => {
		const { token, type } = generateRandomTokenEmailOrSms();
		const tokenExpires = Date.now() - 1000;
		const req = {
			user: {
				verification: { token, tokenExpires, type, isVerified: false },
				save: jest.fn(),
			},
			params: { verificationToken: token },
		};
		const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

		await postVerifyCode[1](req, res);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			message: "Verification code has expired. Please request a new one.",
		});
		expect(req.user.verification.isVerified).toBe(false);
		expect(req.user.save).not.toHaveBeenCalled();
		expect(req.user.verification.token).not.toBe(token);
	});

	it("returns 400 if verification code is invalid", async () => {
		const { token, tokenExpires, type } = generateRandomTokenEmailOrSms();
		const req = {
			user: {
				verification: { token, tokenExpires, type, isVerified: false },
				save: jest.fn(),
			},
			params: { verificationToken: faker.string.uuid() },
		};
		const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

		await postVerifyCode[1](req, res);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			message: "Invalid verification code.",
		});
		expect(req.user.verification.isVerified).toBe(false);
		expect(req.user.save).not.toHaveBeenCalled();
	});

	it("returns 401 if user is not logged in", async () => {
		const req = {
			user: null,
			params: { verificationToken: faker.string.uuid() },
		};
		const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

		await postVerifyCode[1](req, res);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			message: "User not logged in.",
		});
	});

	it("returns 401 if user is already verified", async () => {
		const { token, type, tokenExpires } = generateRandomTokenEmailOrSms();
		const req = {
			user: {
				verification: { token, tokenExpires, type, isVerified: true },
				save: jest.fn(),
			},
			params: { verificationToken: token },
		};
		const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

		await postVerifyCode[1](req, res);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			message: "User is already verified.",
		});
		expect(req.user.verification.isVerified).toBe(true);
		expect(req.user.save).not.toHaveBeenCalled();
	});
});

describe("POST /verify/link/:verificationToken", () => {
	let user: IUser;

	beforeEach(async () => {
		const { token, tokenExpires, type } = generateRandomTokenEmailOrSms();
		const baseUser = generateUser();
		user = new User({
			...baseUser,
			verification: { token, tokenExpires, type, isVerified: false },
		});
	});

	it("returns 200 and verifies the user if verification link is valid and not expired", async () => {
		await User.create(user);
		const res = await request(app).get(
			`/api/v1/auth/verify/link/${user.verification.token}`,
		);

		expect(res.status).toBe(302);
		expect(res.header.location).toBe("/login");
	});

	it("returns 400 if verification link is expired", async () => {
		user.verification.tokenExpires = Date.now() - 1000;
		await User.create(user);

		const res = await request(app).get(
			`/api/v1/auth/verify/link/${user.verification.token}`,
		);

		expect(res.status).toBe(400);
		expect(res.body.message).toBe(
			"Verification link has expired. Please request a new one.",
		);
	});

	it("returns 401 if verification link is invalid", async () => {
		await User.create(user);

		const res = await request(app).get(
			`/api/v1/auth/verify/link/${faker.string.uuid()}`,
		);

		expect(res.status).toBe(401);
		expect(res.body.message).toBe("Invalid verification link.");
	});

	it("returns 400 if user is already verified", async () => {
		user.verification.isVerified = true;
		await User.create(user);

		const res = await request(app).get(
			`/api/v1/auth/verify/link/${user.verification.token}`,
		);

		expect(res.status).toBe(400);
		expect(res.body.message).toBe("User is already verified.");
	});

	it("returns 401 if user does not exist", async () => {
		const res = await request(app).get(
			`/api/v1/auth/verify/link/${user.verification.token}`,
		);

		expect(res.status).toBe(401);
		expect(res.body.message).toBe("Invalid verification link.");
	});
});

// TODO
jest.mock("../src/utils/generateAndSendToken", () => jest.fn());
describe("POST /verify/resend", () => {
	let user: IUser;
	let userIdType: "email" | "phoneNumber";
	beforeEach(async () => {
		const baseUser = generateUser();
		const { username } = baseUser;
		userIdType = username.includes("@") ? "email" : "phoneNumber";
		const { token, tokenExpires } = generateRandomTokenEmailOrSms(userIdType);
		user = new User({
			...baseUser,
			[userIdType]: username,
			verification: {
				token,
				tokenExpires,
				type: userIdType,
				isVerified: false,
			},
		});
	});

	it("returns 200 and sends a new verification code to the user's email if user is logged in and not verified", async () => {
		await User.create(user);

		const req = { user };
		const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

		await postResendVerificationCode[1](req, res);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({
			message: `Verification code sent to user's ${userIdType}: ${user[userIdType]}.`,
		});

		expect(generateAndSendToken).toHaveBeenCalledWith(
			user,
			"verification",
			userIdType,
		);
		expect(generateAndSendToken).toHaveBeenCalledTimes(1);
	});

	it("returns 400 if user is already verified", async () => {
		user.verification.isVerified = true;
		await User.create(user);

		const req = { user };
		const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

		await postResendVerificationCode[1](req, res);

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			message: "User is already verified.",
		});
		expect(generateAndSendToken).toHaveBeenCalledTimes(0);
	});

	it("returns 401 if user is not logged in", async () => {
		await User.create(user);

		const req = { user: undefined };
		const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

		await postResendVerificationCode[1](req, res);

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({
			message: "User is not logged in.",
		});
		expect(generateAndSendToken).toHaveBeenCalledTimes(0);
	});

	it("returns 500 if an error occurs while generating and sending the token", async () => {
		await User.create(user);

		const req = { user };
		const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

		(generateAndSendToken as jest.Mock).mockRejectedValueOnce(
			new Error("Something went wrong."),
		);

		await postResendVerificationCode[1](req, res);

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({
			message: "Something went wrong.",
		});

		expect(generateAndSendToken).toHaveBeenCalledWith(
			user,
			"verification",
			userIdType,
		);
		expect(generateAndSendToken).toHaveBeenCalledTimes(1);
	});
});

jest.mock("../src/utils/generateAndSendToken", () => jest.fn());
describe("POST /forgot-password", () => {
	afterEach(() => jest.restoreAllMocks());

	it("returns 200 and sends a reset password link to the user's email if user exists", async () => {
		const { user } = await signUpUser();

		const res = await request(app)
			.post("/api/v1/auth/forgot-password")
			.send({
				userId: user.email || user.phoneNumber,
			});

		expect(res.status).toBe(200);
		expect(res.body.message).toBe(
			"If the account exists, a reset password link was sent.",
		);

		expect(generateAndSendToken).toHaveBeenCalledTimes(1);
	});

	it("returns 400 if no userId is provided", async () => {
		const res = await request(app)
			.post("/api/v1/auth/forgot-password")
			.send({});

		expect(res.status).toBe(400);
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
		const res = await request(app).post("/api/v1/auth/forgot-password").send({
			userId: faker.internet.email(),
		});

		expect(res.status).toBe(200);
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
			.post("/api/v1/auth/forgot-password")
			.send({
				userId: user.email || user.phoneNumber,
			});

		expect(res.status).toBe(500);
		expect(res.body.message).toBe("Something went wrong.");

		expect(generateAndSendToken).toHaveBeenCalledTimes(1);
	});
});

describe("POST /reset-password:resetToken", () => {
	let user: IUser;
	let newPassword: string;
	let confirmPassword: string;
	let resetToken: string;

	beforeEach(async () => {
		const { token, tokenExpires, type } = generateRandomTokenEmailOrSms();

		try {
			const { user: newUser } = await signUpUser(
				{ resetPassword: { token, tokenExpires, type } },
				type,
			);
			user = newUser;

			resetToken = token;
			newPassword = generatePassword();
			confirmPassword = newPassword;
		} catch (err) {
			log(err);
		}
	});

	it("returns 200 and resets the user's password if the reset password token is valid", async () => {
		const res = await request(app)
			.post(`/api/v1/auth/reset-password/${resetToken}`)
			.send({ newPassword, confirmPassword });

		expect(res.status).toBe(200);
		expect(res.body.message).toBe("Password reset successfully.");

		const updatedUser = await User.findOne({ _id: user._id });
		if (!updatedUser) throw new Error("User not found.");

		const isMatch = await updatedUser.comparePassword(newPassword);
		expect(isMatch).toBe(true);
	});

	it("returns 400 if the reset password token is invalid ", async () => {
		const res = await request(app)
			.post(`/api/v1/auth/reset-password/${faker.string.uuid()}`)
			.send({ newPassword, confirmPassword });

		expect(res.status).toBe(400);
		expect(res.body.message).toBe("Invalid reset password link.");

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
				`/api/v1/auth/reset-password/${userWithExpiredToken.resetPassword.token}`,
			)
			.send({ newPassword, confirmPassword });

		expect(res.status).toBe(400);
		expect(res.body.message).toBe(
			"Reset password link has expired. Please request a new one.",
		);

		const updatedUser = await User.findOne({ _id: user._id });
		if (!updatedUser) throw new Error("User not found.");

		const isMatch = await updatedUser.comparePassword(newPassword);
		expect(isMatch).toBe(false);
	});

	it("returns 400 if the new password does not match the confirm password", async () => {
		const res = await request(app)
			.post(`/api/v1/auth/reset-password/${resetToken}`)
			.send({ newPassword, confirmPassword: newPassword + "1" });

		expect(res.status).toBe(400);
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
			.post(`/api/v1/auth/reset-password/${resetToken}`)
			.send({
				newPassword: invalidPassword,
				confirmPassword: invalidPassword,
			});

		expect(res.status).toBe(400);
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
			.post(`/api/v1/auth/reset-password/${resetToken}`)
			.send({ newPassword, confirmPassword });

		expect(res.status).toBe(500);
		expect(res.body.message).toBe(
			"An error occurred while resetting your password.",
		);

		const updatedUser = await User.findOne({ _id: user._id });
		if (!updatedUser) throw new Error("User not found.");

		const isMatch = await updatedUser.comparePassword(newPassword);
		expect(isMatch).toBe(false);
	});
});

// TODO
describe("POST /change-password", () => {
	let userId: string;
	let newPassword: string;
	let req: {
		user: IUser | undefined;
		body: { oldPassword: string; newPassword: string; confirmPassword: string };
	};
	let res: { status: typeof jest.fn; json: typeof jest.fn };
	const next = jest.fn();

	beforeEach(async () => {
		const {
			user: { _id },
			password,
		} = await signUpUser();
		userId = _id;
		const user = (await User.findOne({ _id })) as IUser;

		newPassword = generatePassword();
		req = {
			user,
			body: {
				oldPassword: password,
				newPassword,
				confirmPassword: newPassword,
			},
		};
		res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
	});

	it("returns 200 and changes the user's password if the current password is valid", async () => {
		await postChangePassword[4](req, res);

		expect(res.status).toHaveBeenCalledWith(200);
		expect(res.json).toHaveBeenCalledWith({
			message: "Password changed successfully.",
		});

		const updatedUser = await User.findOne({ _id: userId });
		if (!updatedUser) throw new Error("User not found.");

		const isMatch = await updatedUser.comparePassword(newPassword);
		expect(isMatch).toBe(true);
	});

	it("returns 400 if the current password is not valid", async () => {
		req.body.oldPassword = req.body.oldPassword + "1";

		for (let i = 1; i <= 4; i++) {
			await postChangePassword[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({ message: "Incorrect password." });

		const updatedUser = await User.findOne({ _id: userId });
		if (!updatedUser) throw new Error("User not found.");

		const isMatch = await updatedUser.comparePassword(newPassword);
		expect(isMatch).toBe(false);
	});

	it("returns 400 if the new password does not match the confirm password", async () => {
		req.body.confirmPassword = req.body.confirmPassword + "1";

		for (let i = 1; i <= 4; i++) {
			await postChangePassword[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			errors: [
				{
					location: "body",
					msg: "Passwords do not match",
					path: "confirmPassword",
					value: req.body.confirmPassword,
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
		req.body.newPassword = invalidPassword;
		req.body.confirmPassword = invalidPassword;

		for (let i = 1; i <= 4; i++) {
			await postChangePassword[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
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

		for (let i = 1; i <= 4; i++) {
			await postChangePassword[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(500);
		expect(res.json).toHaveBeenCalledWith({
			message: "An error occurred while changing your password.",
		});

		const updatedUser = await User.findOne({ _id: userId });
		if (!updatedUser) throw new Error("User not found.");

		const isMatch = await updatedUser.comparePassword(newPassword);
		expect(isMatch).toBe(false);
	});

	it("returns 401 if the user is not logged in", async () => {
		req.user = undefined;

		for (let i = 1; i <= 4; i++) {
			await postChangePassword[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(401);
		expect(res.json).toHaveBeenCalledWith({ message: "User not logged in" });
	});

	it("returns 400 if the user uses an alternative log in method", async () => {
		if (!req.user) throw new Error("User not found.");
		req.user.password = undefined;

		for (let i = 1; i <= 4; i++) {
			await postChangePassword[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			message: "User uses an alternative log in method.",
		});
	});

	it("returns 400 if the old password is empty", async () => {
		req.body.oldPassword = "";

		for (let i = 1; i <= 4; i++) {
			await postChangePassword[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
			errors: [
				{
					location: "body",
					msg: "Invalid value",
					path: "oldPassword",
					value: req.body.oldPassword,
					type: "field",
				},
			],
		});
	});

	it("returns 400 if the new password is empty", async () => {
		req.body.newPassword = "";
		req.body.confirmPassword = "";

		for (let i = 1; i <= 4; i++) {
			await postChangePassword[i](req, res, next);
		}

		expect(res.status).toHaveBeenCalledWith(400);
		expect(res.json).toHaveBeenCalledWith({
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
	afterEach(() => jest.clearAllMocks());

	it("should return 302 and redirect to Facebook", async () => {
		jest
			.spyOn(passport, "authenticate")
			.mockImplementation(() => (req: Request, res: Response) => {
				res.redirect("https://www.facebook.com");
			});

		const response = await request(app).get("/api/v1/auth/login/facebook");

		expect(response.status).toBe(302);
		expect(response.headers.location).toContain("https://www.facebook.com");
	});
});

describe("GET /login/google", () => {
	it("should return 200 and redirect to Google", async () => {
		jest
			.spyOn(passport, "authenticate")
			.mockImplementation(() => (req: Request, res: Response) => {
				res.redirect("https://www.google.com");
			});

		const response = await request(app).get("/api/v1/auth/login/google");

		expect(response.status).toBe(302);
		expect(response.headers.location).toContain(
			"https://accounts.google.com/o/oauth2/",
		);
	});
});

describe("GET /login/github", () => {
	it("should return 200 and redirect to Github", async () => {
		jest
			.spyOn(passport, "authenticate")

			.mockImplementation(() => (req: Request, res: Response) => {
				res.redirect("https://www.github.com");
			});

		const response = await request(app).get("/api/v1/auth/login/github");

		expect(response.status).toBe(302);
		expect(response.headers.location).toContain(
			"https://github.com/login/oauth/authorize",
		);
	});
});

afterEach(() => jest.restoreAllMocks());
afterAll(async () => await disconnectFromDatabase());
