import sharp from "sharp";

export const resizeImage = async (
	file: Express.Multer.File,
	size: { width: number; height: number },
): Promise<Buffer> => {
	try {
		return await sharp(file.buffer).resize(size).png().toBuffer();
	} catch (error) {
		throw new Error(`Failed to resize image: ${error.message}`);
	}
};

const resizeImages = async (
	files: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] },
	size = { width: 1280, height: 720 },
) => {
	// Convert the files into a flat array
	let fileList: Express.Multer.File[];

	if (Array.isArray(files)) {
		fileList = files;
	} else {
		fileList = ([] as Express.Multer.File[]).concat(...Object.values(files));
	}

	// Resize each file
	return await Promise.all(
		fileList.map(async (file) => resizeImage(file, size)),
	);
};

export default resizeImages;
