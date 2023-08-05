const getNextIndexArray = (index: number, arrayLength: number) =>
	index === arrayLength - 1 ? 0 : index + 1;

export default getNextIndexArray;
