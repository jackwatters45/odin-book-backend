import { IPost } from "../../src/models/post.model";

const getPostIdsFromPosts = (posts: IPost[]) => posts.map((post) => post._id);

export default getPostIdsFromPosts;
