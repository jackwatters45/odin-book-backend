import expressAsyncHandler from "express-async-handler";
import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import passport from "passport";
import jwt, { JwtPayload } from "jsonwebtoken";
import debug from "debug";

import User from "../models/user.model";
import { jwtSecret, nodeEnv, refreshTokenSecret } from "../config/envVariables";
import generateAndSendToken from "../utils/generateAndSendToken";
import { authenticateJwt } from "../middleware/authConfig";
import { IUser } from "../../types/IUser";

const log = debug("log:auth:controller");
const errorLog = debug("error:auth:controller");

// TODO cookie options
export const handleUserLogin = async (res: Response, user: IUser) => {
	const payload = { id: user._id };

	const jwtToken = jwt.sign(payload, jwtSecret, {
		expiresIn: "1h",
	});

	const refreshToken = jwt.sign(payload, refreshTokenSecret, {
		expiresIn: "7d",
	});

	user.refreshTokens.push(refreshToken);
	await user.save();

	res.cookie("jwt", jwtToken, {
		maxAge: 3600000,
		httpOnly: true,
		// secure: true,
		// sameSite: "none",
	});

	res.cookie("refreshToken", refreshToken, {
		maxAge: 604800000, // 7 days
		httpOnly: true,
		// secure: true,
		// sameSite: "none",
	});

	const { password: _, ...userWithoutPassword } = user.toObject();
	res.status(200).json({
		message: "Logged in successfully.",
		user: userWithoutPassword,
	});

	const { isVerified, type } = user.verification;
	if (isVerified || nodeEnv === "test" || user.userType === "guest") return;

	try {
		await generateAndSendToken(user, "verification", type);
	} catch (err) {
		res.status(500).json({ message: err.message });
		return;
	}
};

// @desc    Log in a user
// @route   POST /login
// @access  Public
export const postLogin = [
	body("username").notEmpty().trim().withMessage("Email/Phone is required"),
	body("password").notEmpty().trim().withMessage("Password is required"),
	expressAsyncHandler(
		async (req: Request, res: Response, next: NextFunction) => {
			try {
				const errors = validationResult(req);

				if (!errors.isEmpty()) {
					res.status(400).json({ errors: errors.array() });
					return;
				}

				passport.authenticate(
					"local",
					{ session: false },
					function (err: Error, user: IUser, info: { message: string }) {
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
						handleUserLogin(res, user);
					},
				)(req, res, next);
			} catch (err) {
				errorLog(err);
				res.status(500).json({ message: "Server error" });
			}
		},
	),
];

// @desc    Login as guest
// @route   POST /login-guest
// @access  Public
export const postLoginGuest = expressAsyncHandler(
	async (req: Request, res: Response) => {
		try {
			const user = await User.create(
				new User({
					firstName: "guest",
					lastName: "user",
					userType: "guest",
					validUntil: Date.now() + 1000 * 60 * 15,
				}),
			);
			handleUserLogin(res, user);
		} catch (err) {
			errorLog(err);
			res.status(500).json({ message: "Server error" });
		}
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
		.isLength({ min: 5, max: 50 })
		.withMessage("Username should be between 5 and 50 characters"),
	body("password")
		.notEmpty()
		.trim()
		.isLength({ min: 8, max: 50 })
		.withMessage("Password should be at least 8 characters long")
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
			const currentDate = new Date();
			let age = currentDate.getFullYear() - birthDate.getFullYear();
			const m = currentDate.getMonth() - birthDate.getMonth();

			if (m < 0 || (m === 0 && currentDate.getDate() < birthDate.getDate())) {
				age--;
			}

			if (age < 13) {
				throw new Error("User must be at least 13 years old to register.");
			}

			return true;
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
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				res.status(400).json({ errors: errors.array() });
				return;
			}

			const { firstName, password, lastName, username, birthday } = req.body;

			const idType = username.includes("@") ? "email" : "phoneNumber";

			const userExists = await User.findOne({ [idType]: username });
			if (userExists) {
				res
					.status(400)
					.json({ message: "User with this email/phone already exists" });
				return;
			}

			const user = new User({
				firstName,
				lastName,
				password,
				birthday,
				pronouns: req.body?.pronouns ?? undefined,
				gender: req.body?.gender ?? undefined,
				[idType]: username,
				verification: {
					isVerified: false,
					type: idType,
				},
			});

			await user.save();

			handleUserLogin(res, user);
		} catch (err) {
			errorLog(err);
			res.status(500).json({ message: "An unexpected error occurred." });
		}
	}),
];

// @desc    Log out a user
// @route   POST /logout
// @access  Public
export const postLogout = expressAsyncHandler(
	async (req: Request, res: Response, next: NextFunction) => {
		const refreshToken = req.cookies.refreshToken;

		if (!refreshToken) {
			res.status(401).json({ message: "Refresh token not found" });
			return;
		}

		try {
			const decoded = jwt.verify(refreshToken, refreshTokenSecret) as {
				id: string;
			};

			const userId = decoded.id;

			const user = await User.findById(userId);
			if (!user) {
				res.status(401).json({ message: "Invalid or expired token" });
				return;
			}

			user.refreshTokens = user.refreshTokens.filter(
				(token) => token !== refreshToken,
			);
			await user.save();
		} catch (err) {
			res.status(401).json({ message: "Invalid or expired token" });
			return;
		}

		res.clearCookie("jwt", {
			httpOnly: true,
			// secure: true,
			// sameSite: "none",
		});

		res.clearCookie("refreshToken", {
			httpOnly: true,
			// secure: true,
			// sameSite: "none",
		});

		res.status(200).json({ message: "User logged out successfully" });
	},
);

// @desc    Get current user
// @route   GET /current-user
// @access  Private
export const getCurrentUser = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const token = req.cookies.jwt;
		if (!token) {
			res.status(200).json({
				isAuthenticated: false,
				message: "You must be logged in to perform this action",
			});
			return;
		}

		try {
			const { _id } = jwt.verify(token, jwtSecret) as JwtPayload;
			const user = await User.findOne(
				{ _id, isDeleted: false },
				{ password: 0 },
			);
			if (!user) {
				res
					.status(401)
					.json({ isAuthenticated: false, message: "User not found" });
				return;
			}

			res.status(200).json({ user, isAuthenticated: true });
		} catch (err) {
			errorLog(err);
			res.status(401).json({ isAuthenticated: false, message: err.message });
		}
	},
);

// @desc    Refresh user token
// @route   POST /refresh-token
// @access  Private
export const postRefreshToken = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const token = req.cookies.refreshToken;
		if (!token) {
			res.status(401).json({ message: "Refresh token not found" });
			return;
		}

		let user: IUser | null = null;
		try {
			const { id } = jwt.verify(token, refreshTokenSecret) as { id: string };
			user = await User.findOne({ _id: id, isDeleted: false }, { password: 0 });
			if (!user || user.refreshTokens.indexOf(token) === -1) {
				res
					.status(401)
					.json({ message: "User not found or refresh token invalid" });
				return;
			}
		} catch (err) {
			res.status(401).json({ message: "Invalid or expired token" });
			return;
		}

		try {
			const newPayload = { id: user._id, name: user.firstName };
			const newJwtToken = jwt.sign(newPayload, jwtSecret, {
				expiresIn: "1h",
			});
			const newRefreshToken = jwt.sign(newPayload, refreshTokenSecret, {
				expiresIn: "7d",
			});

			user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
			user.refreshTokens.push(newRefreshToken);
			await user.save();

			res.cookie("jwt", newJwtToken, {
				maxAge: 3600000, // 1 hour
				httpOnly: true,
				// secure: true,
				// sameSite: "none",
			});
			res.cookie("refreshToken", newRefreshToken, {
				maxAge: 604800000, // 7 days
				httpOnly: true,
				// secure: true,
				// sameSite: "none",
			});

			res.status(200).json({ message: "Refreshed token successfully." });
		} catch (err) {
			errorLog(err);
			res.status(500).json({
				message: "An unexpected error occurred while refreshing jwt token.",
				error: err.message,
			});
		}
	},
);

// @desc    Verify user using code
// @route   POST /verify/code/:verificationToken
// @access  Private
export const postVerifyCode = [
	authenticateJwt,
	expressAsyncHandler(async (req: Request, res: Response) => {
		try {
			const loggedInUser = req.user as IUser;
			const user = await User.findById(loggedInUser._id);
			if (!user) {
				res.status(404).json({ message: "User not found." });
				return;
			}

			if (user.verification.isVerified) {
				// shouldn't be possible that user is verified but token is not undefined
				user.verification.token = undefined;
				user.verification.tokenExpires = undefined;
				await user.save();
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
				user.verification.token = undefined;
				user.verification.tokenExpires = undefined;
				await user.save();
				res.status(400).json({
					message: "Verification code has expired. Please request a new one.",
				});
				return;
			}

			user.verification.isVerified = true;
			user.verification.token = undefined;
			user.verification.tokenExpires = undefined;

			await user.save();
			res.status(200).json({ message: "Verification successful." });
		} catch (error) {
			errorLog(error);
			res.status(500).json({
				message:
					error.message || "An error occurred while verifying your account.",
			});
		}
	}),
];

// @desc    Verify user using link
// @route   GET /verify/link/:verificationToken
// @access  Public
export const getVerifyLink = expressAsyncHandler(
	async (req: Request, res: Response) => {
		const { verificationToken } = req.params;

		try {
			const user = await User.findOne({
				"verification.token": verificationToken,
				isDeleted: false,
			});

			if (!user) {
				res.status(401).json({ message: "Invalid verification link." });
				return;
			}

			if (user.verification.isVerified) {
				user.verification.token = undefined;
				user.verification.tokenExpires = undefined;
				await user.save();
				res.status(400).json({ message: "User is already verified." });
				return;
			}

			const { verification } = user;
			if (verification.tokenExpires && verification.tokenExpires < Date.now()) {
				user.verification.token = undefined;
				user.verification.tokenExpires = undefined;
				await user.save();
				res.status(400).json({
					message: "Verification link has expired. Please request a new one.",
				});
				return;
			}

			user.verification.isVerified = true;
			user.verification.token = undefined;
			user.verification.tokenExpires = undefined;
			await user.save();

			res.redirect("/login");
		} catch (err) {
			errorLog(err);
			res
				.status(500)
				.json({ message: err.message || "An error occurred while verifying." });
		}
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

		try {
			await generateAndSendToken(user, "verification", type);
			const destination = type === "email" ? user.email : user.phoneNumber;
			res.status(200).json({
				message: `Verification code sent to user's ${type}: ${destination}.`,
			});
		} catch (err) {
			errorLog(err);
			res.status(500).json({
				message:
					err.message || "An error occurred while sending verification code.",
			});
		}
	}),
];

// @route   POST /forgot-password
// @desc    Send reset password link
// @access  Public
export const postForgotPassword = [
	body("userId")
		.trim()
		.isLength({ min: 1 })
		.escape()
		.withMessage("Email or phone is required."),
	expressAsyncHandler(async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			res.status(400).json({ errors: errors.array() });
			return;
		}

		const { userId } = req.body;
		const idType = userId.includes("@") ? "email" : "phoneNumber";

		try {
			const user = await User.findOne({ [idType]: userId });
			if (!user) {
				res.status(200).json({
					message: "If the account exists, a reset password link was sent.",
				});
				return;
			}

			await generateAndSendToken(user, "resetPassword", idType);
			res.status(200).json({
				message: "If the account exists, a reset password link was sent.",
			});
		} catch (err) {
			errorLog(err);
			res.status(500).json({
				message: err.message || "Could not send reset password email.",
			});
		}
	}),
];

// TODO generate token hash

// @route   GET /reset-password/:resetToken
// @desc    Confirm reset password code
// @access  Public
export const getResetPassword = expressAsyncHandler(async (req, res) => {
	const resetToken = req.params.resetToken;
	try {
		const user = await User.findOne({ "resetPassword.token": resetToken });
		if (!user) {
			res.status(400).json({ message: "Invalid reset password code." });
			return;
		}

		const { resetPassword } = user;
		if (resetPassword.tokenExpires && resetPassword.tokenExpires < Date.now()) {
			res.status(400).json({
				message: "Reset password code has expired. Please request a new one.",
			});
			return;
		}

		res.status(302).json({ message: "Reset password code is valid." });
	} catch (err) {
		errorLog(err);
		res

			.status(500)
			.json({ message: "An error occurred while resetting your password." });
	}
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
		try {
			const user = await User.findOne({ "resetPassword.token": resetToken });
			if (!user) {
				res.status(400).json({ message: "Invalid reset password code." });
				return;
			}

			const { resetPassword } = user;
			if (
				resetPassword.tokenExpires &&
				resetPassword.tokenExpires < Date.now()
			) {
				res.status(400).json({
					message: "Reset password code has expired. Please request a new one.",
				});
				return;
			}

			user.password = newPassword;
			user.resetPassword.token = undefined;
			user.resetPassword.tokenExpires = undefined;

			await user.save();

			res.status(200).json({ message: "Password reset successfully." });
		} catch (err) {
			errorLog(err);
			res
				.status(500)
				.json({ message: "An error occurred while resetting your password." });
		}
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
		try {
			const isMatch = await user.comparePassword(oldPassword);
			if (!isMatch) {
				res.status(400).json({ message: "Incorrect password." });
				return;
			}

			user.password = newPassword;
			await user.save();

			res.status(200).json({ message: "Password changed successfully." });
		} catch (err) {
			errorLog(err);
			res
				.status(500)
				.json({ message: "An error occurred while changing your password." });
		}
	}),
];

// @desc    Login with Facebook
// @route   GET /login/facebook
// @access  Public
export const getLoginFacebook = passport.authenticate("facebook", {
	scope: ["email"],
});

export const getLoginFacebookCallback = [
	passport.authenticate("facebook", {
		successRedirect: "/",
		failureRedirect: "/login",
		session: false,
	}),
	(req: Request, res: Response) => {
		handleUserLogin(res, req.user as IUser);
	},
];

// @desc    Login with Google
// @route   GET /login/google
// @access  Public
export const getLoginGoogle = passport.authenticate("google", {
	scope: ["profile", "email"],
});

export const getLoginGoogleCallback = [
	passport.authenticate("google", {
		successRedirect: "/",
		failureRedirect: "/login",
		session: false,
	}),
	(req: Request, res: Response) => {
		handleUserLogin(res, req.user as IUser);
	},
];

// @desc    Login with Github
// @route   GET /login/github
// @access  Public
export const getLoginGithub = passport.authenticate("github", {
	scope: ["user:email"],
});

export const getLoginGithubCallback = [
	passport.authenticate("github", {
		failureRedirect: "/login",
		session: false,
	}),
	(req: Request, res: Response) => {
		handleUserLogin(res, req.user as IUser);
	},
];
