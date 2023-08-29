import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.model";
import debug from "debug";

import { jwtSecret, refreshTokenSecret } from "../config/envVariables";
import { IUser } from "../../types/IUser";

const log = debug("log:refreshTokens");

const refreshTokensMiddleware = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const accessToken = req.cookies.jwt;
	const refreshToken = req.cookies.refreshToken;
	try {
		jwt.verify(accessToken, jwtSecret);
		next();
	} catch (error) {
		if (!refreshToken) {
			return res
				.status(200)
				.json({ isAuthenticated: false, message: "Refresh token not found" });
		}

		let decoded;
		try {
			decoded = jwt.verify(refreshToken, refreshTokenSecret) as { _id: string };
		} catch (err) {
			return res.status(401).json({
				isAuthenticated: false,
				message: "Invalid or expired refresh token",
			});
		}

		const user: IUser | null = await User.findOne(
			{ _id: decoded._id, isDeleted: false },
			{ password: 0 },
		);

		if (!user || user.refreshTokens.indexOf(refreshToken) === -1) {
			return res.status(401).json({
				isAuthenticated: false,
				message: "User not found or refresh token invalid",
			});
		}

		const newPayload = { _id: user._id, name: user.firstName };
		const newAccessToken = jwt.sign(newPayload, jwtSecret, { expiresIn: "1h" });
		const newRefreshToken = jwt.sign(newPayload, refreshTokenSecret, {
			expiresIn: "7d",
		});

		user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
		user.refreshTokens.push(newRefreshToken);
		await user.save();

		res.cookie("jwt", newAccessToken, {
			maxAge: 3600000, // 1 hour
			httpOnly: true,
		});
		res.cookie("refreshToken", newRefreshToken, {
			maxAge: 604800000, // 7 days
			httpOnly: true,
		});

		next();
	}
};

export default refreshTokensMiddleware;
