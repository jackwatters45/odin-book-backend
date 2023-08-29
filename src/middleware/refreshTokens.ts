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
		next(); // Access token is valid, continue to the route
	} catch (error) {
		// Access token is invalid or expired. Try refreshing using the refresh token.
		if (!refreshToken) {
			console.log("No refresh token found");
			return res.status(401).json({ message: "Refresh token not found" });
		}

		let decoded;
		try {
			decoded = jwt.verify(refreshToken, refreshTokenSecret) as { _id: string };
		} catch (err) {
			return res
				.status(401)
				.json({ message: "Invalid or expired refresh token" });
		}

		// Now that we're sure the refreshToken is a valid JWT, let's check it against the database
		const user: IUser | null = await User.findOne(
			{ _id: decoded._id, isDeleted: false },
			{ password: 0 },
		);

		if (!user || user.refreshTokens.indexOf(refreshToken) === -1) {
			return res
				.status(401)
				.json({ message: "User not found or refresh token invalid" });
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

		// Continue processing the original request
		next();
	}
};

export default refreshTokensMiddleware;
