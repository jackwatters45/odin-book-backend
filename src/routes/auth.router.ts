import express from "express";
import {
	getCurrentUser,
	getLoginFacebook,
	getLoginFacebookCallback,
	getLoginGithub,
	getLoginGithubCallback,
	getLoginGoogle,
	getLoginGoogleCallback,
	getResetPasswordCode,
	getResetPasswordLink,
	getVerifyLink,
	postChangePassword,
	postCreateNewGuestUser,
	postFindAccount,
	postForgotPassword,
	postLogin,
	postLoginForgotPassword,
	postLoginGuest,
	postLogout,
	postResendVerificationCode,
	postResetPassword,
	postSignUp,
	postVerifyCode,
	updateForgottenPassword,
} from "../controllers/auth/auth.controller";

const router = express.Router();

//  /login
router.post("/login", postLogin);

// /login/forgot-password
router.post("/login/forgot-password", postLoginForgotPassword);

// /login-guest
router.post("/login-guest", postLoginGuest);

// /guest-user
router.post("/guest-user", postCreateNewGuestUser);

// /signup
router.post("/signup", postSignUp);

// /logout
router.post("/logout", postLogout);

// /current-user
router.get("/current-user", getCurrentUser);

// /verify/code/:verificationToken
router.post("/verify/code/:verificationToken", postVerifyCode);

// /verify/link/:verificationToken
router.get("/verify/link/:verificationToken", getVerifyLink);

// /verify/resend
router.post("/verify/resend", postResendVerificationCode);

// /find-account
router.post("/find-account", postFindAccount);

// /forgot-password
router.post("/forgot-password", postForgotPassword);

// /update-password/:token
router.post("/update-password/:token", updateForgottenPassword);

// /reset-password/code/:resetCode
router.get("/reset-password/code/:resetCode", getResetPasswordCode);

// /reset-password/link/:resetToken
router.get("/reset-password/link/:resetToken", getResetPasswordLink);

// /reset-password/code/:resetToken
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
