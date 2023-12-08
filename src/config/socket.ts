import { Server as SocketServer } from "socket.io";
import { IncomingMessage, Server, ServerResponse } from "http";
import debug from "debug";

import { corsOrigin } from "./envVariables";
import { getRedis } from "./redis";

const log = debug("log:socket");

let io: SocketServer | null = null;

export const initSocket = async (
	server: Server<typeof IncomingMessage, typeof ServerResponse>,
) => {
	io = new SocketServer(server, {
		cors: {
			origin: corsOrigin,
			methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
		},
	});

	return io;
};

export const getIO = () => {
	if (!io) {
		throw new Error("Socket.io not initialized!");
	}
	return io;
};

export const configSocket = async () => {
	const io = getIO();
	const redisClient = getRedis();

	io.on("connection", (socket) => {
		socket.on("register", async (userId) => {
			await redisClient.set(userId, socket.id);
			await redisClient.set(socket.id, userId);
		});

		socket.on("disconnect", async () => {
			const userId = await redisClient.get(socket.id);

			if (userId) await redisClient.del(userId);
			await redisClient.del(socket.id);
		});

		socket.onAny((event, ...args) => {
			log(event, socket.id, args);
		});
	});
};
