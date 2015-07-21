//firs require OzwiloUtil
var co = require('./OzwiloUtil')({Fakelogin:true});

//set conf see conf.json
if (process.argv.length > 2) {
 co.setconf(process.argv[2]);
}

//and get the token thanks to closure...

co.Fakelogin.getToken(function (token){

co.getUserInfo(token,function(err,result)
			{
			if(err)return;
			console.log(require("util").inspect(result));
			
			co.getTokenInfo(token,function(err,result)
			{
			if(err)return;
			console.log(require("util").inspect(result));
			});
});


console.log("token:"+token);
});
