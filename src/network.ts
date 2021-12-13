import { Client } from 'node-ssdp';
import find from 'local-devices';
import { rootLogger } from './logger';
import { timeout as timeoutPromise } from './utils';

const client = new Client();

export interface Device {
	name: string;
	ip: string;
	uuid: string;
	mac: string;
}

export const scanDevices = async (timeout = 5000): Promise<Device[]> => {
	rootLogger.info('Scan all devices');
	const responses: Device[] = [];
	client.on('response', async (headers, code, rinfo) => {
		rootLogger.debug({ headers, code, rinfo }, 'Get ssdp response');
		const deviceHeader = headers['DLNADEVICENAME.LGE.COM'];
		const deviceName = deviceHeader
			? decodeURIComponent(deviceHeader)
			: null;
		const cache = new Set();
		if (deviceName && !cache.has(deviceName)) {
			cache.add(deviceName);

			const ip = rinfo['address'];

			responses.push({
				name: deviceName,
				ip,
				uuid: (headers['USN'] || '').split(':')[1],
				mac: await getMacAddress(ip),
			});
		}
	});

	client.search('urn:schemas-upnp-org:device:MediaRenderer:1');
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			if (!responses.length) {
				reject(new Error('Discover timeout'));
				return;
			}
			resolve(responses);
		}, timeout);
	});
};

export const scanOneDevice = async (timeout = 5000): Promise<Device> => {
	rootLogger.info('Scan one device');
	const errorPromise = timeoutPromise(new Error('Discover timeout'), timeout);

	const discoverPromise = new Promise(resolve => {
		client.on('response', async (headers, code, rinfo) => {
			rootLogger.debug({ headers, code, rinfo }, 'Get ssdp response');
			client.stop();
			const deviceHeader = headers['DLNADEVICENAME.LGE.COM'];
			const deviceName = deviceHeader
				? decodeURIComponent(deviceHeader)
				: null;
			if (deviceName) {
				const ip = rinfo['address'];
				resolve({
					name: deviceName,
					ip,
					uuid: (headers['USN'] || '').split(':')[1],
					mac: await getMacAddress(ip),
				});
			}
		});

		client.search('urn:schemas-upnp-org:device:MediaRenderer:1');
	});

	return Promise.race([discoverPromise, errorPromise]) as Promise<any>;
};

export const getMacAddress = async (ip: string) => {
	const device = (await find(ip)) as any;
	const mac = device ? device.mac : null;
	if (!mac) {
		throw new Error('Mac address not found');
	}
	return mac;
};
