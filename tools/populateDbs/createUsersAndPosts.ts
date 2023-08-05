import getPostIdsFromPosts from "../../tests/utils/getPostIdsFromPosts";
import { createPosts } from "./posts/populatePosts";
import { addSavedPosts } from "./posts/utils/addSavedPosts";
import { createUsers } from "./users/populateUsers";

const createUsersAndSavedPosts = async (num = 5) => {
	const users = await createUsers(num);
	const posts = await createPosts(num);

	const postIds = getPostIdsFromPosts(posts);
	const userWithSavedPosts = await addSavedPosts(users, postIds);

	return { users: userWithSavedPosts, posts };
};

export default createUsersAndSavedPosts;
