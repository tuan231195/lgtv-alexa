import LGTV from 'lgtv2';
import Logger from 'bunyan';
import { promisify } from 'util';
import { getStoredConfig, writeStoredConfig } from './setup';
import { scanOneDevice } from './network';
import { rootLogger } from './logger';
import { getYoutubeURL, searchYoutubeVideos } from './youtube';
import { getMovies } from './netflix';
import { sleep, timeout as timeoutPromise } from './utils';
const wol = require('wol');

interface TvConfig {
	name: string;
	ip: string;
	mac: string;
}

export class LgTvClient {
	private connection: LGTV | null = null;
	private readonly url: string;
	private logger: Logger;
	private isConnected = false;
	private listeners: any[] = [];

	constructor(private readonly tvConfig: TvConfig) {
		this.url = `ws://${tvConfig.ip}:3000`;
		this.logger = rootLogger.child({ tvConfig });
	}

	private connect(timeout = 5000): Promise<LGTV> {
		const errorPromise = timeoutPromise(
			new Error('Connect timeout'),
			timeout
		);
		const connectPromise: Promise<LGTV> = new Promise((resolve, reject) => {
			if (this.isConnected && this.connection) {
				resolve(this.connection);
			}
			if (!this.connection) {
				this.connection = LGTV({
					url: this.url,
				});

				this.connection.on('connect', () => {
					this.logger.info('TV Connected');
					this.isConnected = true;
					this.notifyConnect();
				});
				this.connection.on('error', err => {
					this.logger.error({ err }, 'Got TV connection error');
					this.isConnected = false;
					this.notifyConnect(err);
					this.disconnect();
				});

				this.connection.on('close', () => {
					this.logger.error('Client closed connection');
					this.isConnected = false;
					this.notifyConnect(new Error('Client closed connection'));
					this.disconnect();
				});
			}

			const unsubscribe = this.onConnect(err => {
				unsubscribe();
				if (err) {
					reject(err);
				} else {
					resolve(this.connection!);
				}
			});
		});

		return Promise.race([connectPromise, errorPromise]);
	}

	private onConnect = listener => {
		this.listeners.push(listener);

		return () => {
			this.listeners = this.listeners.filter(
				current => current !== listener
			);
		};
	};

	private notifyConnect = (err?: Error) => {
		for (const listener of this.listeners) {
			listener(err);
		}
	};

	async powerOn() {
		this.logger.info('Powering on TV');
		const wake = promisify(wol.wake.bind(wol));
		await wake(this.tvConfig.mac);
	}

	async powerOff() {
		this.logger.info('Powering off TV');
		await this.request('ssap://system/turnOff');
		this.disconnect();
	}

	async volumeUp() {
		this.logger.info('Volume up TV');
		await this.request('ssap://audio/volumeUp');
	}

	async volumeDown() {
		this.logger.info('Volume down TV');
		await this.request('ssap://audio/volumeDown');
	}

	async mute(muted: boolean) {
		this.logger.info(`${muted ? 'Mute' : 'Unmute'} TV`);
		await this.request('ssap://audio/setMute', { mute: muted });
	}

	async setVolume(volume: number) {
		this.logger.info({ volume }, 'Set TV volume');
		await this.request('ssap://audio/setVolume', { volume });
	}

	async channelUp() {
		this.logger.info('Channel up');
		await this.request('ssap://tv/channelUp');
	}

	async channelDown() {
		this.logger.info('Channel down');
		await this.request('ssap://tv/channelDown');
	}

	async openChannel(title: string) {
		this.logger.info({ title }, 'Open channel');
		const { channels } = await this.request('ssap://tv/getChannelList');
		const channel = channels.find(({ title: currentTitle }) =>
			currentTitle.toLowerCase().includes(title.toLowerCase())
		);
		if (!channel) {
			throw new Error('No channel found');
		}
		await this.request('ssap://tv/openChannel', {
			channelId: channel?.id,
		});
	}

	async openApp(title: string, params?: any) {
		this.logger.info({ title, params }, 'Open app');

		const app = await this.findApp(title);
		await this.request('ssap://system.launcher/launch', {
			id: app.id,
			params,
		});
	}

	async closeApp(title: string) {
		this.logger.info({ title }, 'Close app');

		const app = await this.findApp(title);
		await this.request('ssap://system.launcher/close', {
			id: app.id,
		});
	}

	private async findApp(title: string) {
		const { apps } = await this.request(
			'ssap://com.webos.applicationManager/listApps'
		);
		const app = apps.find(({ title: currentTitle }) =>
			currentTitle.toLowerCase().includes(title.toLowerCase())
		);
		if (!app) {
			throw new Error('No app found');
		}
		return app;
	}

	async playMedia() {
		this.logger.info('Play Media');
		await this.request('ssap://media.controls/play');
	}

	async stopMedia() {
		this.logger.info('Stop Media');
		await this.request('ssap://media.controls/stop');
	}

	async pauseMedia() {
		this.logger.info('Pause Media');
		await this.request('ssap://media.controls/pause');
	}

	async fastForwardMedia() {
		this.logger.info('Fastfoward Media');
		await this.request('ssap://media.controls/fastForward');
	}

	async rewindMedia() {
		this.logger.info('Rewind Media');
		await this.request('ssap://media.controls/rewind');
	}

	async disconnect() {
		this.logger.info('Disconnect TV');
		this.connection?.disconnect();
		this.isConnected = false;
		await sleep(2000);
	}

	async openYoutube(title: string) {
		const [result] = await searchYoutubeVideos(title, 1);
		const id = result?.raw?.id?.videoId;
		if (!id) {
			throw new Error(`Video ${title} not found`);
		}

		const url = getYoutubeURL(id);
		await this.openApp('youtube', { contentTarget: url });
	}

	async openNetflix(title: string) {
		const movies = await getMovies();
		console.log(movies);

		const movie = movies.find(({ movie: currentTitle }) =>
			currentTitle.toLowerCase().includes(title.toLowerCase())
		);
		const id = movie?.id;
		if (!id) {
			throw new Error(`Movie ${title} not found`);
		}

		await this.openApp('netflix', {
			contentTarget: `m=https%3A%2F%2Fapi.netflix.com%2Fcatalog%2Ftitles%2Fmovies%2F${id}&source_type=4`,
		});
	}

	async request(cmd: string, payload?: any) {
		const connection = await this.connect();
		return promisify(connection.request.bind(connection) as any)(
			cmd,
			payload
		);
	}
}

export const createLGClient = async (userId: string, tvName = 'TV') => {
	const existingConfig = await getStoredConfig(userId);
	const logger = rootLogger.child({ tvName, userId });

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
		await writeStoredConfig(userId, existingConfig);
	}

	return lgClient;
};
