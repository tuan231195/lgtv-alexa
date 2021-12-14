import fs from 'fs-extra';
import path from 'path';
import ppath from 'persist-path';
import mkdirp from 'mkdirp';
import crypto from 'crypto';
import { Device } from './network';

export const getKeyFilePath = (accountId: string, uuid: string) => {
	const prefix = getConfigFolder(accountId);
	return path.resolve(prefix, `keyFile-${uuid}`);
};

type Config = Record<string, Device>;

export const getStoredConfig = async (accountId: string): Promise<Config> => {
	const prefix = getConfigFolder(accountId);

	const configFile = path.resolve(prefix, 'config.json');
	if (await fs.exists(configFile)) {
		return fs.readJSON(configFile);
	}
	return {};
};

export const writeStoredConfig = async (accountId: string, config: Config) => {
	const prefix = getConfigFolder(accountId);

	const configFile = path.resolve(prefix, 'config.json');
	await fs.writeJSON(configFile, config);
};

const getConfigFolder = (accountId: string) => {
	const prefix = ppath(`lgtv/${md5(accountId)}`);
	mkdirp(prefix);
	return prefix;
};

export const md5 = (str: string) => {
	return crypto
		.createHash('md5')
		.update(str)
		.digest('hex');
};
