import { ObjectId, Schema, model } from "mongoose";

export interface ILifeEvent {
	_id: ObjectId;
	title: string;
	date: Date;
	createdAt: Date;
	updatedAt: Date;

	location?: string;
}

const lifeEventSchema = new Schema<ILifeEvent>(
	{
		title: { type: String, required: true },
		date: { type: Date, required: true },
		location: { type: String },
	},
	{ timestamps: true },
);

export default model<ILifeEvent>("LifeEvent", lifeEventSchema);
