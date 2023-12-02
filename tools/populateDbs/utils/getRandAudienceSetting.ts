import { faker } from "@faker-js/faker";
import { AudienceStatusOptionsType } from "../../../types/audience";

const getRandAudienceSetting = (): AudienceStatusOptionsType =>
	faker.datatype.boolean() ? "Public" : "Friends";

export default getRandAudienceSetting;
