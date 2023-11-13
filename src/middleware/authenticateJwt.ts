import { NextFunction, Request, Response } from "express";
import passport from "passport";
import debug from "debug";

import { IUser } from "../../types/IUser";

const log = debug("log:authenticateJwt");

const authenticateJwt = (req: Request, res: Response, next: NextFunction) => {
	passport.authenticate(
		"jwt",
		{ session: false },
		(err: Error, user: IUser) => {
			if (err) {
				log(err);
				return next(err);
			}

			if (!user) {
				res
					.status(401)
					.json({ message: "You must be logged in to perform this action" });
				return;
			}
			req.user = user;
			next();
		},
	)(req, res, next);
};

export default authenticateJwt;
