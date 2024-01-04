import expressAsyncHandler from "express-async-handler";
import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import passport from "passport";
import jwt, { JwtPayload } from "jsonwebtoken";

import User, { IUser } from "../../models/user.model";
import {
	corsOrigin,
	jwtSecret,
	nodeEnv,
	refreshTokenSecret,
} from "../../config/envVariables";
import { generateAndSendToken, useResetToken } from "./utils";
import validateAndFormatUsername from "../../utils/validateAndFormatUsername";
import refreshTokensMiddleware from "../../middleware/refreshTokens";
import authenticateJwt from "../../middleware/authenticateJwt";
import validateBirthdayDate from "../../utils/validateBirthdayDate";
import createFakeUser from "../../../tools/createFakeUser";

const loginUser = async (userId: string) => {
	const payload = { _id: userId };

	const jwtToken = jwt.sign(payload, jwtSecret, {
		expiresIn: "1h",
	});

	const refreshToken = jwt.sign(payload, refreshTokenSecret, {
		expiresIn: "7d",
	});

	const updatedUser = await User.findByIdAndUpdate(
		userId,
		{ refreshTokens: [refreshToken] },
		{ new: true },
	).select("verification");

	if (!updatedUser) throw new Error("User not found.");

	return {
		jwtToken,
		refreshToken,
		message: "Logged in successfully.",
		user: updatedUser.toObject(),
	};
};

export const handleUserLogin = async (res: Response, userId: string) => {
	const { jwtToken, refreshToken, message, user } = await loginUser(userId);

	res.cookie("jwt", jwtToken, {
		maxAge: 3600000,
		httpOnly: true,
		secure: true,
		sameSite: "none",
	});

	res.cookie("refreshToken", refreshToken, {
		maxAge: 604800000, // 7 days
		httpOnly: true,
		secure: true,
		sameSite: "none",
	});

	const { isVerified, type } = user.verification;
	if (!isVerified && nodeEnv === "production" && user.userType !== "guest") {
		await generateAndSendToken(user, "verification", type);
	}

	res.status(200).json({ message, user: user });
};

// @desc    Log in a user
// @route   POST /login
// @access  Public
export const postLogin = [
	body("username").notEmpty().trim().withMessage("Email/Phone is required"),
	body("password").notEmpty().trim().withMessage("Password is required"),
	expressAsyncHandler(
		async (req: Request, res: Response, next: NextFunction) => {
			const errors = validationResult(req);

			if (!errors.isEmpty()) {
				res.status(400).json({ errors: errors.array() });
				return;
			}

			passport.authenticate(
				"local",
				{ session: false },
				async (err: Error, user: IUser, info: { message: string }) => {
					if (err) {
						res.status(500).json({ message: err.message });
						return;
					}

					if (!user) {
						res
							.status(401)
							.json({ message: info.message || "Invalid credentials" });
						return;
					}
					await handleUserLogin(res, user._id);
				},
			)(req, res, next);
		},
	),
];

// @desc    Log in user who forgot password but not changing password
// @route /login/forgot-password
// @access  Public
export const postLoginForgotPassword = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const token = req.body.token;

		if (!token) {
			res.status(401).json({ message: "Token not found" });
			return;
		}

		const user = (await User.findOne({
			"resetPassword.token": token,
			isDeleted: false,
		}).select("password resetPassword")) as IUser;

		await resetResetPassword(user);

		await handleUserLogin(res, user._id);
	},
);

// @desc    Login as guest
// @route   POST /login-guest
// @access  Public
export const postLoginGuest = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const guestUser = await User.findOneAndUpdate(
			{ userType: "guest" },
			{ $set: { userType: "default" } },
			{ new: true },
		);

		const user = guestUser ? guestUser : ((await createFakeUser()) as IUser);

		await handleUserLogin(res, user._id);
	},
);

// @desc    Create new guest user
// @route   POST /guest-user
// @access  Public
export const postCreateNewGuestUser = expressAsyncHandler(
	async (req: Request, res: Response) => {
		await createFakeUser();

		res.status(200).json({ message: "Guest user created successfully." });
	},
);

// @desc    Register a new user
// @route   POST /signup
// @access  Public
export const postSignUp = [
	body("firstName")
		.notEmpty()
		.trim()
		.withMessage("First name is required and should not be empty"),
	body("lastName")
		.notEmpty()
		.trim()
		.withMessage("Last name is required and should not be empty")
		.isLength({ max: 50 })
		.withMessage("Last name should be less than 50 characters"),
	body("username")
		.notEmpty()
		.trim()
		.withMessage(
			"Username id is required and should be a valid email or phone number",
		)
		.isLength({ min: 5, max: 254 })
		.withMessage("Username should be between 5 and 254 characters (inclusive)"),
	body("password")
		.notEmpty()
		.trim()
		.isLength({ min: 8, max: 100 })
		.withMessage(
			"Password should be at least 8  and no longer than 100 characters long",
		)
		.matches(
			/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*?()])[A-Za-z\d!@#$%^&*?()]{8,}$/,
			"i",
		)
		.withMessage(
			"Password must contain at least one uppercase letter, one lowercase letter, one special character, one number, and be at least 8 characters long",
		),
	body("birthday")
		.notEmpty()
		.trim()
		.isISO8601()
		.withMessage(
			"Birthday is required and should be a valid date in ISO 8601 format",
		)
		.custom((birthday) => {
			const birthDate = new Date(birthday);
			return validateBirthdayDate(birthDate);
		}),
	body("pronouns")
		.optional()
		.trim()
		.notEmpty()
		.withMessage("Pronouns should not be empty if provided")
		.isIn(["they/them", "she/her", "he/him"])
		.withMessage(
			"Pronouns should be one of the following: they/them, she/her, he/him",
		),
	body("gender")
		.optional()
		.trim()
		.notEmpty()
		.withMessage("Gender should not be empty if provided"),
	expressAsyncHandler(async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const { firstName, password, lastName, username, birthday } = req.body;

		const { usernameType, formattedUsername } =
			validateAndFormatUsername(username);

		const userExists = await User.findOne({
			[usernameType]: formattedUsername,
		});
		if (userExists) {
			res
				.status(400)
				.json({ message: "User with this email/phone already exists" });
			return;
		}

		const user = new User({
			firstName,
			lastName,
			fullName: `${firstName} ${lastName}`,
			password,
			birthday,
			pronouns: req.body?.pronouns ?? undefined,
			gender: req.body?.gender ?? undefined,
			[usernameType]: formattedUsername,
			verification: {
				isVerified: false,
				type: usernameType,
			},
		});

		await user.save();

		await handleUserLogin(res, user._id);
	}),
];

// @desc    Log out a user
// @route   POST /logout
// @access  Public
export const postLogout = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const refreshToken = req.cookies.refreshToken;

		if (!refreshToken) {
			res.status(401).json({ message: "Refresh token not found" });
			return;
		}

		const { _id } = jwt.verify(refreshToken, refreshTokenSecret) as {
			_id: string;
		};

		const user = await User.findById(_id).select("refreshTokens");
		if (!user) {
			res.status(401).json({ message: "Invalid or expired token" });
			return;
		}

		user.refreshTokens = user.refreshTokens.filter(
			(token) => token !== refreshToken,
		);
		await user.save();

		res.clearCookie("jwt", {
			httpOnly: true,
			secure: true,
			sameSite: "none",
		});

		res.clearCookie("refreshToken", {
			httpOnly: true,
			secure: true,
			sameSite: "none",
		});

		res.status(200).json({ message: "User logged out successfully" });
	},
);

// @desc    Get current user
// @route   GET /current-user
// @access  Private
export const getCurrentUser = [
	refreshTokensMiddleware,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const token = req.cookies.jwt;
		if (!token) {
			res.status(200).json({
				isAuthenticated: false,
				message: "You must be logged in to perform this action",
			});
			return;
		}

		const { _id } = jwt.verify(token, jwtSecret) as JwtPayload;

		const user = await User.findOne({ _id, isDeleted: false });
		if (!user) {
			res
				.status(401)
				.json({ isAuthenticated: false, message: "User not found" });
			return;
		}

		res.status(200).json({ user, isAuthenticated: true });
	}),
];

const resetVerification = useResetToken("verification");

// @desc    Verify user using code
// @route   POST /verify/code/:verificationToken
// @access  Private
export const postVerifyCode = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const loggedInUser = req.user as IUser;
		const user = await User.findById(loggedInUser._id).select("verification");
		if (!user) {
			res.status(404).json({ message: "User not found." });
			return;
		}

		if (user.verification.isVerified) {
			// shouldn't be possible that user verified but token defined
			await resetVerification(user);
			res.status(400).json({ message: "User is already verified." });
			return;
		}

		const { verificationToken } = req.params;
		const { verification } = user;
		if (verification.token !== verificationToken) {
			res.status(400).json({ message: "Invalid verification code." });
			return;
		}

		if (verification.tokenExpires && verification.tokenExpires < Date.now()) {
			await resetVerification(user);
			res.status(400).json({
				message: "Verification code has expired. Please request a new one.",
			});
			return;
		}

		user.verification.isVerified = true;
		await resetVerification(user);

		res.status(200).json({ message: "Verification successful." });
	}),
];

// @desc    Verify user using link
// @route   GET /verify/link/:verificationToken
// @access  Public
export const getVerifyLink = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const { verificationToken } = req.params;

		const user = await User.findOne({
			"verification.token": verificationToken,
			isDeleted: false,
		}).select("verification");
		if (!user) {
			res.status(401).json({ message: "Invalid verification link." });
			return;
		}

		if (user.verification.isVerified) {
			await resetVerification(user);
			res.status(400).json({ message: "User is already verified." });
			return;
		}

		const { verification } = user;
		if (verification.tokenExpires && verification.tokenExpires < Date.now()) {
			await resetVerification(user);

			await user.save();
			res.status(400).json({
				message: "Verification link has expired. Please request a new one.",
			});
			return;
		}

		user.verification.isVerified = true;
		await resetVerification(user);

		res.status(302).json({ message: "Verification successful." });
	},
);

// @desc    Resend verification code
// @route   POST /verify/resend
// @access  Private
export const postResendVerificationCode = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		const user = req.user as IUser;

		const { isVerified, type } = user.verification;

		if (isVerified) {
			res.status(400).json({
				message: "User is already verified.",
			});
			return;
		}

		await generateAndSendToken(user, "verification", type);
		const destination = type === "email" ? user.email : user.phoneNumber;
		res.status(200).json({
			message: `Verification code sent to user's ${type}: ${destination}.`,
		});
	}),
];

// @route   POST /forgot-password
// @desc    Send reset password link
// @access  Public
export const postForgotPassword = [
	body("userId")
		.trim()
		.isLength({ min: 5 })
		.escape()
		.withMessage("Email or phone is required."),
	expressAsyncHandler(async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const { userId } = req.body;
		const { usernameType, formattedUsername } =
			validateAndFormatUsername(userId);

		const user = await User.findOne({
			[usernameType]: formattedUsername,
		});
		if (!user) {
			res.status(200).json({
				message: "If the account exists, a reset password link was sent.",
			});
			return;
		}

		await generateAndSendToken(user, "resetPassword", usernameType);
		res.status(200).json({
			message: "If the account exists, a reset password link was sent.",
			// TODO add to test
			userId,
		});
	}),
];

// @route   POST /find-account/
// @desc    Find account
// @access  Public
export const postFindAccount = expressAsyncHandler(async (req, res) => {
	const username = req.body.username;
	const { usernameType, formattedUsername } =
		validateAndFormatUsername(username);

	const user = await User.findOne({
		[usernameType]: formattedUsername,
	}).select("fullName avatarUrl phoneNumber email");
	if (!user) {
		res.status(404).json({ message: "User not found." });
		return;
	}

	res.status(200).json({ message: "User found.", user });
});

// @route   POST /update-password/:token
// @desc    Update password
// @access  Public
export const updateForgottenPassword = [
	body("newPassword")
		.notEmpty()
		.trim()
		.isLength({ min: 8 })
		.withMessage("Password should be at least 8 characters long")
		.matches(
			/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*?()])[A-Za-z\d!@#$%^&*?()]{8,}$/,
			"i",
		)
		.withMessage(
			"Password must contain at least one uppercase letter, one lowercase letter, one special character, one number, and be at least 8 characters long",
		),
	expressAsyncHandler(async (req: Request, res: Response) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const user = await User.findOne({
			"resetPassword.token": req.params.token,
		}).select("password resetPassword");

		if (!user) {
			res.status(400).json({ message: "Invalid reset password token." });
			return;
		}

		const { resetPassword } = user;
		if (resetPassword.tokenExpires && resetPassword.tokenExpires < Date.now()) {
			await resetResetPassword(user);
			res.status(400).json({
				message: "Reset password token has expired. Please request a new one.",
			});

			return;
		}

		user.password = req.body.newPassword;
		await resetResetPassword(user);

		res.status(200).json({ message: "Password updated successfully." });
	}),
];

const resetResetPassword = useResetToken("resetPassword");

// result based on findOne in below functions is the same
const resetPassword = async (
	user: IUser,
	res: Response,
	name: "token" | "code",
) => {
	if (!user) {
		res.status(400).json({ message: `Invalid reset password ${name}.` });
		return;
	}

	const { resetPassword } = user;
	if (resetPassword.tokenExpires && resetPassword.tokenExpires < Date.now()) {
		res.status(400).json({
			message: `Reset password ${name} has expired. Please request a new one.`,
		});
		await resetResetPassword(user);
		return;
	}

	res.status(302).json({
		message: `Reset password ${name} is valid.`,
		token: resetPassword.token,
	});
};

// @route   GET /reset-password/code/:resetCode
// @desc    Confirm reset password code
// @access  Public
export const getResetPasswordCode = expressAsyncHandler(async (req, res) => {
	const resetCode = req.params.resetCode;
	const user = (await User.findOne({
		"resetPassword.code": resetCode,
	}).select("resetPassword")) as IUser;

	await resetPassword(user, res, "code");
});

// @route   GET /reset-password/link/:resetToken
// @desc    Confirm reset password link
// @access  Public
export const getResetPasswordLink = expressAsyncHandler(async (req, res) => {
	const resetToken = req.params.resetToken;

	const user = (await User.findOne({
		"resetPassword.token": resetToken,
	}).select("resetPassword")) as IUser;

	await resetPassword(user, res, "token");
});

// @route   POST /reset-password/:resetToken
// @desc    Reset password
// @access  Public
export const postResetPassword = [
	body("newPassword")
		.notEmpty()
		.trim()
		.isLength({ min: 8 })
		.withMessage("Password should be at least 8 characters long")
		.matches(
			/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*?()])[A-Za-z\d!@#$%^&*?()]{8,}$/,
			"i",
		)
		.withMessage(
			"Password must contain at least one uppercase letter, one lowercase letter, one special character, one number, and be at least 8 characters long",
		),
	body("confirmPassword")
		.notEmpty()
		.trim()
		.custom((confirmPassword, { req }) => {
			if (confirmPassword !== req.body.newPassword) {
				throw new Error("Passwords do not match.");
			}
			return true;
		}),
	expressAsyncHandler(async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const { newPassword } = req.body;

		const { resetToken } = req.params;

		const user = await User.findOne({
			"resetPassword.token": resetToken,
		}).select("password resetPassword");
		if (!user) {
			res.status(400).json({ message: "Invalid reset password code." });
			return;
		}

		const { resetPassword } = user;
		if (resetPassword.tokenExpires && resetPassword.tokenExpires < Date.now()) {
			await resetResetPassword(user);
			res.status(400).json({
				message: "Reset password code has expired. Please request a new one.",
			});
			return;
		}

		user.password = newPassword;
		await resetResetPassword(user);

		res.status(200).json({ message: "Password reset successfully." });
	}),
];

// @desc    Change password
// @route   POST /change-password
// @access  Private
export const postChangePassword = [
	authenticateJwt,
	body("newPassword")
		.notEmpty()
		.trim()
		.isLength({ min: 8 })
		.withMessage("Password should be at least 8 characters long")
		.matches(
			/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*?()])[A-Za-z\d!@#$%^&*?()]{8,}$/,
			"i",
		)
		.withMessage(
			"Password must contain at least one uppercase letter, one lowercase letter, one special character, one number, and be at least 8 characters long",
		),
	body("confirmPassword")
		.notEmpty()
		.trim()
		.custom((confirmPassword, { req }) => {
			if (confirmPassword !== req.body.newPassword) {
				throw new Error("Passwords do not match");
			}
			return true;
		}),
	body("oldPassword").notEmpty().trim(),
	expressAsyncHandler(async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const reqUser = req.user as IUser;
		const user = await User.findById(reqUser?._id).select("password");
		if (!user) {
			res
				.status(401)
				.json({ message: "You must be logged in to perform this action" });
			return;
		}

		if (!user.password) {
			res
				.status(400)
				.json({ message: "User uses an alternative log in method." });
			return;
		}

		const { oldPassword, newPassword } = req.body;
		const isMatch = await user.comparePassword(oldPassword);
		if (!isMatch) {
			res.status(400).json({ message: "Incorrect password." });
			return;
		}

		user.password = newPassword;
		await user.save();

		res.status(200).json({ message: "Password changed successfully." });
	}),
];

// @desc    Login with Facebook
// @route   GET /login/facebook
// @access  Public
export const getLoginFacebook = passport.authenticate("facebook", {
	scope: ["email"],
});

export const getLoginFacebookCallback = (req: Request, res: Response) => {
	passport.authenticate(
		"facebook",
		{ session: false },
		async (err?: Error, user?: IUser, info?: { message: string }) => {
			if (info?.message === "Email already registered using another method") {
				return res.redirect(`${corsOrigin}/login?error=emailAlreadyRegistered`);
			}

			if (err || !user) {
				return res.redirect(`${corsOrigin}/login?error=serverError`);
			}

			const {
				jwtToken,
				refreshToken,
				user: userObj,
			} = await loginUser(user?._id);

			res.cookie("jwt", jwtToken, {
				maxAge: 3600000,
				httpOnly: true,
				secure: true,
				sameSite: "none",
			});

			res.cookie("refreshToken", refreshToken, {
				maxAge: 604800000, // 7 days
				httpOnly: true,
				secure: true,
				sameSite: "none",
			});

			const { isVerified, type } = userObj.verification;
			if (
				!isVerified &&
				nodeEnv === "production" &&
				userObj.userType !== "guest"
			) {
				await generateAndSendToken(user, "verification", type);
			}

			return res.redirect(`${corsOrigin}/`);
		},
	)(req, res);
};

// @desc    Login with Google
// @route   GET /login/google
// @access  Public
export const getLoginGoogle = passport.authenticate("google", {
	scope: ["profile", "email"],
});

export const getLoginGoogleCallback = (req: Request, res: Response) => {
	passport.authenticate(
		"google",
		{ session: false },
		async (err?: Error, user?: IUser, info?: { message: string }) => {
			if (info?.message === "Email already registered using another method") {
				return res.redirect(`${corsOrigin}/login?error=emailAlreadyRegistered`);
			}

			if (err || !user) {
				return res.redirect(`${corsOrigin}/login?error=serverError`);
			}

			const {
				jwtToken,
				refreshToken,
				user: userObj,
			} = await loginUser(user?._id);

			res.cookie("jwt", jwtToken, {
				maxAge: 3600000,
				httpOnly: true,
				secure: true,
				sameSite: "none",
			});

			res.cookie("refreshToken", refreshToken, {
				maxAge: 604800000, // 7 days
				httpOnly: true,
				secure: true,
				sameSite: "none",
			});

			const { isVerified, type } = userObj.verification;
			if (
				!isVerified &&
				nodeEnv === "production" &&
				userObj.userType !== "guest"
			) {
				await generateAndSendToken(user, "verification", type);
			}

			return res.redirect(`${corsOrigin}/`);
		},
	)(req, res);
};

// @desc    Login with Github
// @route   GET /login/github
// @access  Public
export const getLoginGithub = passport.authenticate("github", {
	scope: ["user:email"],
});

export const getLoginGithubCallback = (req: Request, res: Response) => {
	passport.authenticate(
		"github",
		{ session: false },
		async (err?: Error, user?: IUser, info?: { message: string }) => {
			if (info?.message === "Email already registered using another method") {
				return res.redirect(`${corsOrigin}/login?error=emailAlreadyRegistered`);
			}

			if (err || !user) {
				return res.redirect(`${corsOrigin}/login?error=serverError`);
			}

			const {
				jwtToken,
				refreshToken,
				user: userObj,
			} = await loginUser(user?._id);

			res.cookie("jwt", jwtToken, {
				maxAge: 3600000,
				httpOnly: true,
				secure: true,
				sameSite: "none",
			});

			res.cookie("refreshToken", refreshToken, {
				maxAge: 604800000, // 7 days
				httpOnly: true,
				secure: true,
				sameSite: "none",
			});

			const { isVerified, type } = userObj.verification;
			if (
				!isVerified &&
				nodeEnv === "production" &&
				userObj.userType !== "guest"
			) {
				await generateAndSendToken(user, "verification", type);
			}

			return res.redirect(`${corsOrigin}/`);
		},
	)(req, res);
};
