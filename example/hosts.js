var lfsw = require('../library');

var i = new lfsw({ idk: '' });

i.getHosts(function(res) {

	if (res.isError())
	{
		console.error(res.raw);
		return;
	}

	console.log(res.data);

});
