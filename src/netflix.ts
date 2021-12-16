const axios = require('axios').default;

const options = {
	method: 'GET',
	url: 'https://api.jsonbin.io/b/61bb2d4e0ddbee6f8b1eec02/latest',
};

export const getMovies = () => {
	return axios.request(options).then(response => {
		return response.data;
	});
};
