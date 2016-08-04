//first require OzwiloUtil
var co = require('./OzwiloUtil')({
	// we need Fakelogin to get token
	Fakelogin: true 
});

// If the user specifies a config file (otherwise we use conf.json)
if (process.argv.length > 2) {
	co.setconf(process.argv[2]);
}

//and now we get the token thanks to closure...
co.Fakelogin.getTokenKeepInMind(function(token, id_token) {
	//getTokenKeepInMind to keep the token in the next call of the function

	console.log("token:" + token);
	console.log("idtoken:" + id_token);

	//Get information about the user who poses token : see [doc.ozwillo.com](http://doc.ozwillo.com/)
	co.getUserInfo(token, function(err, result) {
		if (err) return;
		console.log(require("util").inspect(result));

		//some info about the token : [doc.ozwillo.com](http://doc.ozwillo.com/)
		co.getTokenInfo(token, function(err, result) {
			if (err) return;
			console.log(require("util").inspect(result));
		});
	});


});
