// description : 
// This module is here to connect your app to Ozwillo with your app acount : ie is util to make syncronisation between the datacore and your database
// look at config.json


var regCode = /code:<\/strong> (\w+)<\/p>/g;

var log;
var request 
var conf;

FakeLogin = module.exports = function(obj)
{

log=obj.log;
request=obj.request;
conf=obj.conf;

	return module.exports;
};

FakeLogin.setconf = function(conff) {
	conf=conff;
}

FakeLogin.Fakelogin = function(callback) {
    // summary:
    //     This funtion simule a login on ozwillo acout is util to connet a app user to have acess to datacore
	
	
 /* var authUrl = conf.kernelBaseUrl + '/a/auth?response_type=code'
    + '&client_id=' + conf.app_client_id
    + '&scope=openid%20datacore%20profile%20email'
    ;*/

  var options = {
    rejectUnauthorized: false,
    url: conf.kernelBaseUrl + '/a/login',//TEST
    method: 'POST',
    followAllRedirects: false,//false ??? // let redirect so that cookie will be stored (from Set-Cookie response header)
    headers: {
      referer: conf.kernelBaseUrl + '/a/login',
      'Accept-Encoding': 'gzip, deflate', // since Sept. 2014 else 500 error
		 'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:38.0) Gecko/20100101 Firefox/38.0',
  
		 'Connection' : 'keep-alive',
		 'Content-Type' : 'application/x-www-form-urlencoded',
		 'Accept' :  'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3'

    },
    jar: true, // store cookie in cookie.txt
    ///followRedirect: false, // not to uselessly go to 'continue' URL
    form: {
		_utf8: '☃',
		//'continue': authUrl,
		hl:'fr-FR',
      u : conf.login,
      pwd: conf.password,
      //'continue': conf.kernelBaseUrl,

    }
  };
  log.debug("login options : ", options);
  request(options, function(err, res, body) {
    if(err) {
      log.error("Remote error in login() : " + err);
      return;
    }
	  log.debug("login code:"+res.statusCode);
	 log.debug("login statusMessage:"+res.statusMessage);
   log.debug("login res headers : ", res.headers);

	  
    callback();
  });
};



FakeLogin.getCodeFromKernel = function(callback) {
    // summary:
    //     This funtion can get the Code from the kernel
	
  var options = {
    rejectUnauthorized: false,
    url: conf.kernelBaseUrl + '/a/auth',
    method: 'POST',
    followAllRedirects: false, // don't redirect to be able to extract code from Location header
    headers: {
		 /*'Host': 'accounts.ozwillo-preprod.eu',*/
		 'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:38.0) Gecko/20100101 Firefox/38.0',
		'Accept' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
		'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
		'Accept-Encoding': 'gzip, deflate',
		'Connection': 'keep-alive',
		'application_type': "web",
      referer: conf.kernelBaseUrl + '/a/login',
    },
	 jar : true,
    form: {
      response_type: 'code',
      client_id: conf.app_client_id,
      /*client_secret: conf.app_client_secret,*/
      scope: 'openid offline_access datacore profile email',
      //redirect_uri: 'http://requestb.in/' + requestBinId // NO since Sept. 2014 has to be an approved app ex. portal
      redirect_uri: conf.redirect_uri,
		prompt:"consent"
      /*state: 'a',
      nonce: 'b'*/ // not required
    }
	 
  };

	
	log.debug("getCodeFromKernel params : ", options.form);
  
  request(options, function(err, res, body) {
    // TODO approve if asked to
    if(err) {
      log.error("Remote error getCodeFromKernel : " + err);
      return;
    }
 	log.debug("getCodeFromKernel res headers: ", res.headers);
	   log.debug("getCodeFromKernel code:"+res.statusCode);

	  
	  
	  if(body.indexOf("/a/auth/approve")!=-1)
	  {
		  log.debug("Valide authorisation");
		  
			var options2 = {
			 rejectUnauthorized: false,
			 url: conf.kernelBaseUrl + '/a/auth/approve',
			 method: 'POST',
			 followAllRedirects: false, // don't redirect to be able to extract code from Location header
			 headers: {
				 /*'Host': 'accounts.ozwillo-preprod.eu',*/
				 'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:38.0) Gecko/20100101 Firefox/38.0',
				'Accept' : 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
				'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3',
				'Accept-Encoding': 'gzip, deflate',
				'Connection': 'keep-alive',

				referer: 'https://accounts.ozwillo-dev.eu/a/auth?redirect_uri=http%3A%2F%2Flocalhost%3A10000%2Fcallback&response_type=code&scope=openid%20profile%20datacore%20email%20offline_access&state=security_token%253D25%2526url%253Dhttps%253A%252F%252Flocalhost%25home&nonce=12&prompt=consent&client_id=dc',
				 'Content-Type': 'application/x-www-form-urlencoded'
			 },
			 jar : true,
				qsParseOptions:{indices: false},
				qsStringifyOptions:{indices: false},
			 form: {
				_utf8: '☃', 
				client_id: conf.app_client_id,
				/*client_secret: conf.app_client_secret,*/
				scope: [ 'openid', 'offline_access' ,'datacore' ,'profile' ,'email' ],
				redirect_uri: conf.redirect_uri,
				/*state: 'a',
				nonce: 'b'*/ // not required
				'state':'security_token%253D25%2526url%253Dhttps%253A%252F%252Flocalhost%25home',
				nonce:12
			 }

		  };	  

				request(options2, function(err, res, body) {
					 // TODO approve if asked to
					 if(err) {
						log.error("Remote error getCodeFromKernel : " + err);
						return;
					 }
					log.debug("getCodeFromKernel 2 res headers: ", res.headers);
	   			log.debug("getCodeFromKernel 2 code:"+res.statusCode);
					
					
									 var location = res.headers.location;
					 if (!location) {
						if (body.indexOf("<html>") != -1 && body.indexOf("Authorize") != -1) {
						  log.error("Must authorize first, browse to URL...", body);
						  return;
						}
						log.error("Bad response getCodeFromKernel (no location) : ", res.headers);
						return;
					 }
					 var beforeLocationCode = "code=";
					 var beforeLocationCodeIndex = location.indexOf(beforeLocationCode);
					 if (location.indexOf(beforeLocationCode) === -1) {
						log.error("Bad response getCodeFromKernel, location without code : "+ location);
						return;
					 }
					 var code = location.substring(beforeLocationCodeIndex + beforeLocationCode.length);
					 log.debug("getCodeFromKernel  2 body: ", body);

					 callback(code);
					
				});
		  return;
	  }
	  	log.debug("getCodeFromKernel res body: ", res.body);
	  
	  log.debug("\n\n");
	  
	  
	  
	  
    var location = res.headers.location;
    if (!location) {
      if (body.indexOf("<html>") != -1 && body.indexOf("Authorize") != -1) {
        log.error("Must authorize first, browse to URL...", body);
        return;
      }
      log.error("Bad response getCodeFromKernel (no location) : ", res.headers);
      return;
    }
    var beforeLocationCode = "code=";
    var beforeLocationCodeIndex = location.indexOf(beforeLocationCode);
    if (location.indexOf(beforeLocationCode) === -1) {
      log.error("Bad response getCodeFromKernel, location without code : "+ location);
      return;
    }
    var code = location.substring(beforeLocationCodeIndex + beforeLocationCode.length);
    log.debug("getCodeFromKernel body: ", body);
    
    callback(code);
  });
};




FakeLogin.getToken_pure = function(code, callback) {
	
	    // summary:
    //     With the code we can recup the token
	
  var appBasicAuth = 'Basic ' + new Buffer(conf.app_client_id + ':' + conf.app_client_secret).toString("base64");
	log.debug("AQUISITION DU TOKEN\n\n");
	
  var options = {
    rejectUnauthorized: false,
    url: conf.kernelBaseUrl + '/a/token',
    method: 'POST',
    headers: {
      'Authorization': appBasicAuth
    },
    form: {
      grant_type: 'authorization_code',
      //redirect_uri: 'http://requestb.in/' + requestBinId // NO since Sept. 2014 has to be an approved app ex. portal
      redirect_uri: conf.redirect_uri,
      code: code
    }
  };

  log.debug("getToken req : ", options);
  request(options, function(err, res, body) {
    if(err) {
     log.error("Remote error in getToken() : " + err);
      return;
    }
    log.debug("getToken body ", JSON.stringify(JSON.parse(body),null,' '));
    callback(JSON.parse(body).access_token);
  });
};


FakeLogin.getToken = function(callback) {
	
	    // summary:
    //     This funtion recup a token and send it to callback this is the main function of FakeLogin
	
	FakeLogin.Fakelogin(function (){
		 FakeLogin.getCodeFromKernel(
			function (code){
					
					  FakeLogin.getToken_pure(code, function(tokenf) {           
						 log.debug('\n**********TOKEN**********');
						  log.debug(tokenf);
						  log.debug('**********TOKEN**********\n');
						  token=tokenf;
						callback(token);
					});
			});
			});
}

/*
co.Fakelogin(function (){
		console.log("LOGIN FINISH NOW TEST\n\n");
		 co.getCodeFromKernel(
			function (code){
				console.log("now the code: ", code);
				
					  co.getToken(code, function(tokenf) {           
						 console.log('\n**********TOKEN**********');
						 console.log(tokenf);
						 console.log('**********TOKEN**********\n');
						  token=tokenf;
						TokenArrive();
					});
			});
			});
	


function TokenArrive()
{


 co.getUserInfo(token, 
					 function(userinfo) {
							console.log('Now we now you addrese email haha : '+ userinfo.email);
						 });
	
co.getinfo(token,'sandbox','dc/type/dcmo:model_0', 
					 function(body) {
							console.log('dc/type/dcmo:model_0 :'+ JSON.stringify(body, null, '\t'));
						 });


}*/
