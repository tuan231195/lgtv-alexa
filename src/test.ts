import { LgTvClient } from './client';
import { rootLogger } from './logger';
import { scanOneDevice } from './network';
import { getStoredConfig, writeStoredConfig } from './setup';

start();

async function start() {
	const accountId = 'com.tuannguyen.alexa';
	const tvName = 'TV';
	const existingConfig = await getStoredConfig(accountId);
	const logger = rootLogger.child({ tvName, accountId });

	let lgClient: LgTvClient;
	if (existingConfig[tvName]) {
		logger.info('Use existing config');
		lgClient = new LgTvClient(existingConfig[tvName]);
	} else {
		logger.info('Discover new device');
		const { ip, mac, uuid } = await scanOneDevice();
		const tvConfig = { ip, mac, name: tvName, uuid };
		lgClient = new LgTvClient(tvConfig);
		existingConfig[tvName] = tvConfig;
		logger.info('Updating config');
		await writeStoredConfig(accountId, existingConfig);
	}

	await lgClient.setVolume(12);

	await lgClient.disconnect();

	process.exit(0);
}
