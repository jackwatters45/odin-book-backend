import sharp from "sharp";

const resizeAvatar = async (file: Express.Multer.File | undefined) => {
	if (!file || !file.buffer) return false;

	return await sharp(file.buffer).resize(128, 128).png().toBuffer();
};

export default resizeAvatar;
