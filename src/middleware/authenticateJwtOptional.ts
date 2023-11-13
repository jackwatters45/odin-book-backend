import { NextFunction, Request, Response } from "express";
import passport from "passport";
import debug from "debug";

import { IUser } from "../../types/IUser";

const log = debug("log:authenticateJwt");

const authenticateJwtOptional = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	passport.authenticate(
		"jwt",
		{ session: false },
		(err: Error, user: IUser) => {
			if (err) {
				log(err);
				return next(err);
			}

			// Set req.user if a user is found
			if (user) {
				req.user = user;
			}

			// Proceed to the next middleware or route handler,
			// regardless of whether a user was found or not
			next();
		},
	)(req, res, next);
};

export default authenticateJwtOptional;
