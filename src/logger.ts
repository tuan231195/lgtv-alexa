const bunyan = require('bunyan');

const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

export const rootLogger = bunyan.createLogger({
	name: 'lgtv-alexa',
	level,
	serializers: bunyan.stdSerializers,
});
