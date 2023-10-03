const decodeWebsiteId = (encodedWebsiteId: string) =>
	encodedWebsiteId.replace(/%2E/g, ".");

export default decodeWebsiteId;
