import passport from "passport";
import passportLocal from "passport-local";
import { Application } from "express";
import bcrypt from "bcryptjs";
import session from "express-session";
import dotenv from "dotenv";
import User from "../models/user-model/user.model";
// import passportJwt from "passport-jwt";

dotenv.config();

const LocalStrategy = passportLocal.Strategy;
// const JwtStrategy = passportJwt.Strategy;

const configPassport = (app: Application) => {
	passport.use(
		new LocalStrategy(async (username, password, done) => {
			try {
				const user = await User.findOne({ email: username }).exec();
				if (!user) return done(null, false, { message: "Incorrect email" });

				const match = await bcrypt.compare(password, user.password);

				if (match) return done(null, user);
				return done(null, false, { message: "Incorrect password" });
			} catch (err) {
				return done(err);
			}
		}),
	);

	app.use(
		session({
			secret: process.env.SESSION_SECRET as string,
			resave: false,
			saveUninitialized: true,
			cookie: { maxAge: 1000 * 60 * 60, secure: true, sameSite: "none" },
		}),
	);

	app.use(passport.initialize());
	app.use(passport.session());
};

export default configPassport;
