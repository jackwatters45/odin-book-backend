import sharp from "sharp";

export const resizeImage = async (
	file: Express.Multer.File,
): Promise<Buffer> => {
	try {
		return await sharp(file.buffer).resize(128, 128).png().toBuffer();
	} catch (error) {
		throw new Error(`Failed to resize image: ${error.message}`);
	}
};

const resizeImages = async (
	files: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] },
) => {
	// Convert the files into a flat array
	let fileList: Express.Multer.File[];

	if (Array.isArray(files)) {
		fileList = files;
	} else {
		fileList = ([] as Express.Multer.File[]).concat(...Object.values(files));
	}

	// Resize each file
	return await Promise.all(fileList.map(async (file) => resizeImage(file)));
};

export default resizeImages;
