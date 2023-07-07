import dotenv from "dotenv";

dotenv.config();

const checkEnvVariableString = (variable: string | undefined) => {
	if (!variable) {
		console.error(`${variable} not defined`);
		process.exit(1);
	}
	return variable;
};

export const port = process.env.PORT ?? 5172;

export const mongoDbUri = checkEnvVariableString(process.env.MONGODB_URI);

export const jwtSecret = checkEnvVariableString(process.env.JWT_SECRET);

export const refreshTokenSecret = checkEnvVariableString(
	process.env.REFRESH_TOKEN_SECRET,
);

export const corsOrigin = checkEnvVariableString(process.env.CORS_ORIGIN);

export const cloudinaryApiKey = checkEnvVariableString(
	process.env.CLOUDINARY_API_KEY,
);

export const cloudinarySecretKey = checkEnvVariableString(
	process.env.CLOUDINARY_SECRET_KEY,
);

export const cloudinaryCloudName = checkEnvVariableString(
	process.env.CLOUDINARY_CLOUD_NAME,
);

export const facebookAppId = checkEnvVariableString(
	process.env.FACEBOOK_APP_ID,
);

export const facebookAppSecret = checkEnvVariableString(
	process.env.FACEBOOK_APP_SECRET,
);

export const googleClientId = checkEnvVariableString(
	process.env.GOOGLE_CLIENT_ID,
);

export const googleClientSecret = checkEnvVariableString(
	process.env.GOOGLE_CLIENT_SECRET,
);

export const githubClientId = checkEnvVariableString(
	process.env.GITHUB_CLIENT_ID,
);

export const githubClientSecret = checkEnvVariableString(
	process.env.GITHUB_CLIENT_SECRET,
);

export const emailHost = checkEnvVariableString(process.env.EMAIL_HOST);

export const emailPassword = checkEnvVariableString(process.env.EMAIL_PASSWORD);

export const twilioAccountSid = checkEnvVariableString(
	process.env.TWILIO_ACCOUNT_SID,
);

export const twilioAuthToken = checkEnvVariableString(
	process.env.TWILIO_AUTH_TOKEN,
);

export const twilioPhoneNumber = checkEnvVariableString(
	process.env.TWILIO_PHONE_NUMBER,
);

export const nodeEnv = checkEnvVariableString(process.env.NODE_ENV);
export const appUrl =
	nodeEnv === "production"
		? checkEnvVariableString(process.env.PROD_APP_URL)
		: checkEnvVariableString(process.env.DEV_APP_URL);
