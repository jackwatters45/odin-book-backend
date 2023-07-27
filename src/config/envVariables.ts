import dotenv from "dotenv";

dotenv.config();

const checkEnvVariableString = (name: string) => {
	const variable = process.env[name];
	if (!variable) {
		console.error(`${name} not defined`);
		process.exit(1);
	}
	return variable;
};

export const port = process.env.PORT ?? 5172;

export const jwtSecret = checkEnvVariableString("JWT_SECRET");

export const refreshTokenSecret = checkEnvVariableString(
	"REFRESH_TOKEN_SECRET",
);

export const corsOrigin = checkEnvVariableString("CORS_ORIGIN");

export const cloudinaryApiKey = checkEnvVariableString("CLOUDINARY_API_KEY");

export const cloudinarySecretKey = checkEnvVariableString(
	"CLOUDINARY_SECRET_KEY",
);

export const cloudinaryCloudName = checkEnvVariableString(
	"CLOUDINARY_CLOUD_NAME",
);

export const facebookAppId = checkEnvVariableString("FACEBOOK_APP_ID");

export const facebookAppSecret = checkEnvVariableString("FACEBOOK_APP_SECRET");

export const googleClientId = checkEnvVariableString("GOOGLE_CLIENT_ID");

export const googleClientSecret = checkEnvVariableString(
	"GOOGLE_CLIENT_SECRET",
);

export const githubClientId = checkEnvVariableString("GITHUB_CLIENT_ID");

export const githubClientSecret = checkEnvVariableString(
	"GITHUB_CLIENT_SECRET",
);

export const emailHost = checkEnvVariableString("EMAIL_HOST");

export const emailPassword = checkEnvVariableString("EMAIL_PASSWORD");

export const twilioAccountSid = checkEnvVariableString("TWILIO_ACCOUNT_SID");

export const twilioAuthToken = checkEnvVariableString("TWILIO_AUTH_TOKEN");

export const twilioPhoneNumber = checkEnvVariableString("TWILIO_PHONE_NUMBER");

export const nodeEnv = checkEnvVariableString("NODE_ENV");

export const appUrl =
	nodeEnv === "production"
		? checkEnvVariableString("PROD_APP_URL")
		: checkEnvVariableString("DEV_APP_URL");

export const apiPath = checkEnvVariableString("API_PATH");

// TODO: formatting
export const mongoDbUri =
	nodeEnv === "production"
		? checkEnvVariableString("PROD_DB_URI")
		: nodeEnv === "development"
		? checkEnvVariableString("DEV_DB_URI")
		: checkEnvVariableString("TEST_DB_URI");
