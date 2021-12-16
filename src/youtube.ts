import Youtube from 'simple-youtube-api';
import { rootLogger } from './logger';

const youtube = new Youtube(process.env.YOUTUBE_API_KEY);

export const searchYoutubeVideos = async (title: string, limit = 5) => {
	try {
		return await youtube.searchVideos(title, limit);
	} catch (err) {
		rootLogger.error({ err, title, limit }, 'Failed to search for youtube');
	}
};

export const getYoutubeURL = (id: string) => {
	return `https://youtube.com/tv?v=${id}`;
};
