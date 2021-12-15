require('dotenv').config();
import { Consumer } from 'sqs-consumer';
import { rootLogger } from './logger';
import { handleMessage } from './handler';

rootLogger.info('Starting app');

const app = Consumer.create({
	queueUrl: process.env.SQS_QUEUE,
	handleMessage,
});

app.on('error', err => {
	rootLogger.error({ err }, 'Failed to connect with SQS');
});

app.on('processing_error', err => {
	rootLogger.error({ err }, 'Failed to process');
});

app.start();
