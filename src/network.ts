import { Client } from 'node-ssdp';

const client = new Client();

export const scanForTv = () => {
	return new Promise(resolve => {
		client.on('notify', function() {
			//console.log('Got a notification.')
		});

		client.on('response', function inResponse(headers, code, rinfo) {
			console.log(
				'Got a response to an m-search:\n%d\n%s\n%s',
				code,
				JSON.stringify(headers, null, '  '),
				JSON.stringify(rinfo, null, '  ')
			);
		});

		// Or maybe if you want to scour for everything after 5 seconds
		setInterval(function() {
			client.search('urn:schemas-upnp-org:device:MediaRenderer:1');
		}, 2000);
	});
};
