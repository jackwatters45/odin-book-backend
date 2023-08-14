import { v4 as uuidv4 } from "uuid";
const generateToken = () => ({
	token: uuidv4(),
	code: Math.floor(100000 + Math.random() * 900000).toString(),
	tokenExpires: Date.now() + 1000 * 60 * 15, // 15 minutes
});

export default generateToken;
