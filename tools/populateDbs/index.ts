import mongoose from "mongoose";
import debug from "debug";

import { configDb, disconnectFromDatabase } from "../../src/config/database";
import populateUsers from "./users/populateUsers";
import addFieldsThatRequireOtherUsers from "./users/usersReliantFields/Index";
import createUsersPosts from "./posts";
import { addSavedPosts } from "./posts/utils/addSavedPosts";

const log = debug("log:populateDbs");

export const dropCollections = async () => {
	log("Dropping collections");
	const collections = await mongoose.connection.db.collections();
	if (collections?.length === 0) {
		log("No collections to drop");
		return;
	}

	for (const collection of collections) {
		await collection.drop();
	}
	log("Done dropping collections");
};

export const closeConnection = async () => {
	await mongoose.connection.close();
	log("Connection closed");
};

const run = async () => {
	await configDb();
	await dropCollections(); // remove once switch to dev!!!!!!

	const newUsers = await populateUsers(20); // TODO change to 100

	const usersWithFriends = await addFieldsThatRequireOtherUsers(newUsers);

	await createUsersPosts(usersWithFriends);

	log("Finished populating users");

	await addSavedPosts(usersWithFriends);

	log("Finished adding saved posts");

	await disconnectFromDatabase();
};

run().catch(console.error);


// TODO close search on click
// TODO search needs a limit
// TODO fix other modals

// TODO comment -> display reaction count (just on left side of emojis !)

// TODO fix dashboard to add popular posts
