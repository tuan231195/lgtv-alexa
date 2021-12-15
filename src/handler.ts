import { SQS } from 'aws-sdk';
import NodeCache from 'node-cache';
import { createLGClient, LgTvClient } from './client';
import { rootLogger } from './logger';
import { resetStoredConfig } from './setup';

const clientCache = new NodeCache({
	stdTTL: 60,
	useClones: false,
});

clientCache.on('expired', async function(key, value) {
	try {
		rootLogger.info({ key }, 'Disconnect client due to expiring');
		await value.disconnect();
	} catch (err) {
		rootLogger.error({ err }, 'Failed to disconnect');
	}
});

export const handleMessage = async (message: SQS.Types.Message) => {
	try {
		const { Body: messageBody } = message;
		const { command, params = [], userId } = JSON.parse(messageBody!);
		rootLogger.info({ command, params, userId }, 'Handling new command');

		if (command === 'reset') {
			return resetStoredConfig(userId);
		}
		const client: any = await initClient(userId);
		await client[command](...params);
		if (command === 'powerOff') {
			clientCache.del(userId);
		}
	} catch (err) {
		rootLogger.error({ err }, 'Failed to handle message');
	}
};

const initClient = async (userId: string): Promise<LgTvClient> => {
	if (clientCache.has(userId)) {
		return clientCache.get(userId) as any;
	} else {
		const client = await createLGClient(userId);
		clientCache.set(userId, client);
		return client;
	}
};
