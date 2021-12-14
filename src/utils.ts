export const sleep = (ms: number) =>
	new Promise(resolve => setTimeout(resolve, ms));

export const timeout = (error: Error, ms: number): Promise<never> =>
	new Promise((resolve, reject) => setTimeout(() => reject(error), ms));
