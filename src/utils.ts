export const sleep = (ms: number) =>
	new Promise(resolve => setTimeout(resolve, ms));

export const timeout = (error: Error, ms: number) =>
	new Promise((resolve, reject) => setTimeout(() => reject(error), ms));
