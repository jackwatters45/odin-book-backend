import passport from "passport";
import passportLocal from "passport-local";
import User from "../models/user.model";
import { IUser } from "../../types/IUser";
import passportJwt from "passport-jwt";
import { Request, Application } from "express";
import {
	appUrl,
	facebookAppId,
	facebookAppSecret,
	githubClientId,
	githubClientSecret,
	googleClientId,
	googleClientSecret,
	jwtSecret,
} from "../config/envVariables";
import passportFacebook from "passport-facebook";
import passportGoogle from "passport-google-oauth20";
import passportGithub, { Profile as GithubProfile } from "passport-github2";
import { VerifyCallback } from "passport-oauth2";

import debug from "debug";
import validateAndFormatUsername from "../controllers/utils/validateAndFormatUsername";

const log = debug("log:authConfig");

const LocalStrategy = passportLocal.Strategy;
const JwtStrategy = passportJwt.Strategy;
const FacebookStrategy = passportFacebook.Strategy;
const GoogleStrategy = passportGoogle.Strategy;
const GithubStrategy = passportGithub.Strategy;

const cookieExtractor = (req: Request): string | null => {
	return req && req.cookies ? req.cookies["jwt"] : null;
};

const configAuth = (app: Application) => {
	passport.use(
		new LocalStrategy(async (username, password, done) => {
			try {
				const { usernameType: loginType, formattedUsername } =
					validateAndFormatUsername(username);
				const user = await User.findOne({ [loginType]: formattedUsername });
				if (!user)
					return done(null, false, {
						message: "User with this email/phone not found",
					});

				if (!user.password)
					return done(null, false, {
						message: "User should be logging in with non-local strategy",
					});

				const match = await user.comparePassword(password);

				if (match) return done(null, user);
				return done(null, false, { message: "Incorrect password" });
			} catch (err) {
				return done(err);
			}
		}),
	);

	passport.use(
		new JwtStrategy(
			{
				jwtFromRequest: cookieExtractor,
				secretOrKey: jwtSecret,
			},
			async (jwtPayload, done) => {
				try {
					const user = await User.findById(jwtPayload._id);
					if (!user) return done(null, false);

					const { password: _, ...userWithoutPassword } = user.toObject();

					return done(null, userWithoutPassword);
				} catch (err) {
					return done(err);
				}
			},
		),
	);

	passport.use(
		new FacebookStrategy(
			{
				clientID: facebookAppId,
				clientSecret: facebookAppSecret,
				callbackURL: `${appUrl}/auth/login/facebook/callback`,
				profileFields: ["id", "emails", "name", "gender", "birthday"],
			},
			async (accessToken, refreshToken, profile, done) => {
				try {
					let user = await User.findOne({ facebookId: profile.id });

					if (!user) {
						const email = profile.emails && profile.emails[0].value;
						const alreadyExists = await User.findOne({ email });
						if (alreadyExists) {
							return done(null, false, {
								message: "Email already registered using another method",
							});
						}

						user = new User({
							email: email,
							firstName: profile.name?.givenName,
							lastName: profile.name?.familyName,
							facebookId: profile.id,
							birthday: profile.birthday,
							pronouns: profile.gender ?? undefined,
						});

						await user.save();
					}

					const { password: _, ...userWithoutPassword } = user.toObject();
					return done(null, userWithoutPassword);
				} catch (err) {
					return done(err);
				}
			},
		),
	);

	passport.use(
		new GoogleStrategy(
			{
				clientID: googleClientId,
				clientSecret: googleClientSecret,
				callbackURL: `${appUrl}/auth/login/google/callback`,
			},
			async (accessToken, refreshToken, profile, done) => {
				try {
					let user = await User.findOne({ googleId: profile.id }).exec();

					if (!user) {
						const email = profile.emails && profile.emails[0].value;
						const avatar =
							(profile.photos && profile.photos[0].value) ?? undefined;

						const alreadyExists = await User.findOne({ email });
						if (alreadyExists) {
							return done(null, false, {
								message: "Email already registered using another method",
							});
						}

						user = new User({
							email: email,
							firstName: profile.name?.givenName,
							lastName: profile.name?.familyName,
							googleId: profile.id,
							avatarUrl: avatar,
						});

						await user.save();
					}

					const { password: _, ...userWithoutPassword } = user.toObject();
					return done(null, userWithoutPassword);
				} catch (err) {
					return done(err);
				}
			},
		),
	);

	passport.use(
		new GithubStrategy(
			{
				clientID: githubClientId,
				clientSecret: githubClientSecret,
				callbackURL: `${appUrl}/auth/login/github/callback`,
			},
			async (
				accessToken: string,
				refreshToken: string,
				profile: GithubProfile,
				done: VerifyCallback,
			) => {
				try {
					let user = await User.findOne({ githubId: profile.id });
					if (!user) {
						const email = profile.emails && profile.emails[0].value;

						const alreadyExists = await User.findOne({ email });
						if (alreadyExists) {
							return done(null, false, {
								message: "Email already registered using another method",
							});
						}

						const avatar =
							(profile.photos && profile.photos[0].value) ?? undefined;
						const displayName = profile?.displayName.split(" ");
						const firstName = displayName[0] ?? "";
						const lastName = displayName[1] ?? "";

						user = new User({
							email: email,
							firstName: firstName,
							lastName: lastName,
							githubId: profile.id,
							avatarUrl: avatar,
						});

						await user.save();
					}

					const { password: _, ...userWithoutPassword } = user.toObject();
					return done(null, userWithoutPassword);
				} catch (err) {
					return done(err);
				}
			},
		),
	);

	app.use(async function checkUserRoleAndValidity(req, res, next) {
		const user = req.user as IUser;

		if (!user || user.userType !== "guest") next();
		else {
			if (user?.validUntil && user.validUntil < Date.now()) {
				try {
					await User.findByIdAndDelete(user._id);

					res.clearCookie("jwt", {
						httpOnly: true,
						// secure: true,
						// sameSite: "none",
					});

					res.status(403).json({ message: "Guest session has expired." });
				} catch (err) {
					log(err);
					res.status(500).json({ message: "Error deleting guest user." });
					return;
				}
				return;
			} else {
				next();
			}
		}
	});

	app.use(passport.initialize());
};

export default configAuth;
