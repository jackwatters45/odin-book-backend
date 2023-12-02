import { RedisClientType, createClient } from "redis";
import { redisHost, redisPassword, redisPort } from "./envVariables";
import debug from "debug";

const log = debug("log:redis");

let redisClient: RedisClientType | null = null;

export const initRedis = async () => {
	redisClient = createClient({
		password: redisPassword,
		socket: {
			host: redisHost,
			port: redisPort,
		},
	});

	redisClient.on("error", (err) => {
		log("Redis error: ", err);
	});

	await redisClient.connect();

	return redisClient;
};

export const getRedis = () => {
	if (!redisClient) {
		throw new Error("Redis not initialized!");
	}
	return redisClient;
};
