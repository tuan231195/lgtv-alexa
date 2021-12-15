import fs from 'fs-extra';
import path from 'path';
import ppath from 'persist-path';
import mkdirp from 'mkdirp';
import crypto from 'crypto';
import { Device } from './network';

export const getKeyFilePath = (userId: string, uuid: string) => {
	const prefix = getConfigFolder(userId);
	return path.resolve(prefix, `keyFile-${uuid}`);
};

type Config = Record<string, Device>;

export const getStoredConfig = async (userId: string): Promise<Config> => {
	const prefix = getConfigFolder(userId);

	const configFile = path.resolve(prefix, 'config.json');
	if (await fs.exists(configFile)) {
		return fs.readJSON(configFile);
	}
	return {};
};

export const resetStoredConfig = (userId: string) => {
	const prefix = getConfigFolder(userId);
	const configFile = path.resolve(prefix, 'config.json');

	return fs.remove(configFile);
};

export const writeStoredConfig = async (userId: string, config: Config) => {
	const prefix = getConfigFolder(userId);

	const configFile = path.resolve(prefix, 'config.json');
	await fs.writeJSON(configFile, config);
};

const getConfigFolder = (userId: string) => {
	const prefix = ppath(`lgtv/${md5(userId)}`);
	mkdirp(prefix);
	return prefix;
};

export const md5 = (str: string) => {
	return crypto
		.createHash('md5')
		.update(str)
		.digest('hex');
};
