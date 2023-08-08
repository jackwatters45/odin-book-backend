import express from "express";
import {
	getCurrentUser,
	getLoginFacebook,
	getLoginFacebookCallback,
	getLoginGithub,
	getLoginGithubCallback,
	getLoginGoogle,
	getLoginGoogleCallback,
	getVerifyLink,
	postChangePassword,
	postForgotPassword,
	postLogin,
	postLoginGuest,
	postLogout,
	postRefreshToken,
	postResendVerificationCode,
	postResetPassword,
	postSignUp,
	postVerifyCode,
} from "../controllers/auth.controller";

const router = express.Router();

//  /login
router.post("/login", postLogin);

// /login-guest
router.post("/login-guest", postLoginGuest);

// /signup
router.post("/signup", postSignUp);

// /logout
router.post("/logout", postLogout);

// /current-user
router.get("/current-user", getCurrentUser);

// /refresh-token
router.post("/refresh-token", postRefreshToken);

// /verify/code/:verificationToken
router.post("/verify/code/:verificationToken", postVerifyCode);

// /verify/link/:verificationToken
router.get("/verify/link/:verificationToken", getVerifyLink);

// /verify/resend
router.post("/verify/resend", postResendVerificationCode);

// /forgot-password
router.post("/forgot-password", postForgotPassword);

// /reset-password
router.post("/reset-password/:resetToken", postResetPassword);

// /change-password
router.post("/change-password", postChangePassword);

// /login/facebook
router.get("/login/facebook", getLoginFacebook);

// /login/facebook/callback
router.get("/login/facebook/callback", getLoginFacebookCallback);

// /login/google
router.get("/login/google", getLoginGoogle);

// /login/google/callback
router.get("/login/google/callback", getLoginGoogleCallback);

// /login/github
router.get("/login/github", getLoginGithub);

// /login/github/callback
router.get("/login/github/callback", getLoginGithubCallback);

export default router;
