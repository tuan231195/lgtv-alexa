import LGTV from 'lgtv2';
import { promisify } from 'util';

export class LgTvClient {
	private readonly client: LGTV;
	private isConnected = false;

	constructor(private readonly url: string) {
		this.client = LGTV({
			url,
		});
	}

	connect() {
		return new Promise<void>((resolve, reject) => {
			if (!this.isConnected) {
				this.client.connect(this.url);
			}
			this.client.on('connect', () => {
				this.isConnected = true;
				resolve();
			});
			this.client.on('error', reject);
		});
	}

	powerOn() {}

	async powerOff() {
		await this.request('ssap://system/turnOff');
		this.client.disconnect();
	}

	disconnect() {
		this.client.disconnect();
		this.isConnected = false;
	}

	request(cmd: string, payload?: any) {
		if (!this.isConnected) {
			throw new Error('Client not connected');
		}
		return promisify(this.client.request.bind(this.client))(cmd, payload);
	}
}
