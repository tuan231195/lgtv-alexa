import { createLGClient } from './client';

start();

async function start() {
	const userId = 'com.tuannguyen.alexa';
	const tvName = 'TV';
	const lgClient = await createLGClient(userId, tvName);

	await lgClient.setVolume(12);

	await lgClient.disconnect();

	process.exit(0);
}
