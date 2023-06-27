import { Schema, model, ObjectId, Document } from "mongoose";
import bcrypt from "bcryptjs";

// TODO user profile stuff + max length for description

// Basic User Info
export interface BasicUserInfo {
	firstName: string;
	lastName: string;
	fullName: string;
	email: string;
	username: string;
	password: string;
	avatarUrl: string;
	description: string;
}

// User Activity Data
export interface UserActivityData {
	friends: ObjectId[];
	savedPosts: ObjectId[];
}

// User Deleted Data
interface DeletedData {
	deletedBy: ObjectId | null;
	deletedAt: Date;
	email: string;
	username: string;
	followerCount: number;
}

// User System Data
export interface UserSystemData {
	createdAt: Date;
	updatedAt: Date;
	userType: string;
	isDeleted: boolean;
	deletedData?: DeletedData;
}

export interface IUser
	extends Document,
		BasicUserInfo,
		UserActivityData,
		UserSystemData {}

const UserSchema = new Schema<IUser>(
	{
		firstName: { type: String, required: true, trim: true, maxlength: 25 },
		lastName: { type: String, required: true, trim: true, maxlength: 25 },
		email: { type: String, required: true, trim: true, unique: true },
		username: { type: String, required: true, trim: true, unique: true },
		password: { type: String, required: true, trim: true, minlength: 8 },
		friends: [{ type: Schema.Types.ObjectId, ref: "User" }],
		description: { type: String, trim: true, default: "" },
		avatarUrl: { type: String, trim: true, default: "" },
		savedPosts: [{ type: Schema.Types.ObjectId, ref: "Post" }],
		userType: {
			type: String,
			required: true,
			trim: true,
			default: "user",
			enum: ["user", "admin", "guest"],
		},
		isDeleted: { type: Boolean, default: false },
		deletedData: {
			deletedBy: { type: Schema.Types.ObjectId, ref: "User" },
			deletedAt: { type: Date },
			email: { type: String, trim: true },
			username: { type: String, trim: true },
			followerCount: { type: Number },
		},
	},
	{
		timestamps: true,
		toJSON: { virtuals: true },
		toObject: { virtuals: true },
	},
);

UserSchema.path("friends").default([]);
UserSchema.path("savedPosts").default([]);

UserSchema.virtual("fullName").get(function (this: IUser) {
	return `${this.firstName} ${this.lastName}`;
});

UserSchema.pre("save", async function (next) {
	const SALT_LENGTH = 10;
	if (this.isModified("password") || this.isNew) {
		this.password = await bcrypt.hashSync(this.password, SALT_LENGTH);
	}
	next();
});

UserSchema.methods.comparePassword = async function (password: string) {
	return await bcrypt.compareSync(password, this.password);
};

UserSchema.index({
	firstName: "text",
	lastName: "text",
	email: "text",
	username: "text",
});

export default model<IUser>("User", UserSchema);
