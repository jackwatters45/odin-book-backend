const encodeWebsiteId = (websiteId: string) => websiteId.replace(/\./g, "%2E");

export default encodeWebsiteId;
