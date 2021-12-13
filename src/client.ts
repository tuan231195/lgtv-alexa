import LGTV from 'lgtv2';
import Logger from 'bunyan';
import { promisify } from 'util';
import { rootLogger } from './logger';
import { sleep, timeout as timeoutPromise } from './utils';
const wol = require('wol');

interface TvConfig {
	name: string;
	ip: string;
	mac: string;
}

export class LgTvClient {
	private readonly client: LGTV;
	private isConnected = false;
	private isConnecting: boolean;
	private readonly url: string;
	private logger: Logger;

	constructor(private readonly tvConfig: TvConfig) {
		this.url = `ws://${tvConfig.ip}:3000`;
		this.client = LGTV({
			url: this.url,
		});
		this.isConnecting = true;
		this.logger = rootLogger.child({ tvConfig });
	}

	connect(timeout = 5000) {
		const errorPromise = timeoutPromise(
			new Error('Connect timeout'),
			timeout
		);
		const connectPromise = new Promise<void>((resolve, reject) => {
			if (this.isConnected) {
				return resolve();
			}
			if (!this.isConnected && !this.isConnecting) {
				this.client.connect(this.url);
			}
			this.isConnecting = true;
			this.client.on('connect', () => {
				this.logger.info('TV Connected');
				this.isConnected = true;
				this.isConnecting = false;
				resolve();
			});
			this.client.on('error', err => {
				this.logger.error({ err }, 'Got TV connection error');
				this.isConnecting = false;
				this.isConnected = false;
				reject(err);
			});

			this.client.on('close', () => {
				this.logger.error('Client closed connection');
				this.isConnecting = false;
				this.isConnected = false;
				reject(new Error('Client closed connection'));
			});
		});

		return Promise.race([connectPromise, errorPromise]);
	}

	async powerOn() {
		this.logger.info('Powering on TV');
		const wake = promisify(wol.wake.bind(wol));
		await wake(this.tvConfig.mac);
	}

	async powerOff() {
		this.logger.info('Powering off TV');
		await this.request('ssap://system/turnOff');
		this.client.disconnect();
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

	async mediaPlay() {
		this.logger.info('Play Media');
		await this.request('ssap://media.controls/play');
	}

	async openApp(title: string) {
		this.logger.info({ title }, 'Open app');

		const app = await this.findApp(title);
		await this.request('ssap://system.launcher/launch', {
			id: app.id,
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

	async mediaStop() {
		this.logger.info('Stop Media');
		await this.request('ssap://media.controls/stop');
	}

	async mediaPause() {
		this.logger.info('Pause Media');
		await this.request('ssap://media.controls/pause');
	}

	async mediaFastForward() {
		this.logger.info('Fastfoward Media');
		await this.request('ssap://media.controls/fastForward');
	}

	async mediaRewind() {
		this.logger.info('Rewind Media');
		await this.request('ssap://media.controls/rewind');
	}

	async disconnect() {
		this.logger.info('Disconnect TV');
		this.client.disconnect();
		this.isConnected = false;
		this.isConnecting = false;
		await sleep(2000);
	}

	async request(cmd: string, payload?: any) {
		await this.connect();
		return promisify(this.client.request.bind(this.client) as any)(
			cmd,
			payload
		);
	}
}
