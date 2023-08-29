import multer, { MulterError } from "multer";

const upload = multer({
	limits: {
		fileSize: 1024 * 1024 * 5, // limit file size to 5MB
	},
	fileFilter: (req, file, cb) => {
		if (file.mimetype.startsWith("image/")) {
			cb(null, true);
		} else {
			cb(new MulterError("LIMIT_UNEXPECTED_FILE"));
		}
	},
});

export default upload;
