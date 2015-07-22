// description : 
// This module is here to connect your app to Ozwillo with your app acount : ie is util to make syncronisation between the datacore and your database
// look at config.json


var regCode = /code:<\/strong> (\w+)<\/p>/g;

var log;
var request 
var conf;
var Connection;
var util = require('util');
var extend = require('extend');
const FirefoxHeader = {
      'Accept-Encoding': 'gzip, deflate', // since Sept. 2014 else 500 error
		 'User-Agent': 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:38.0) Gecko/20100101 Firefox/38.0',
  
		 'Connection' : 'keep-alive',
		 'Content-Type' : 'application/x-www-form-urlencoded',
		 'Accept' :  'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
'Accept-Language': 'fr,fr-FR;q=0.8,en-US;q=0.5,en;q=0.3'

    }; 


FakeLogin = module.exports = function(obj)
{

log=obj.log;
request=obj.request;
conf=obj.conf;
Connection = obj.Connection;

	return module.exports;
};

FakeLogin.setconf = function(conff) {
	conf=conff;
}

FakeLogin.Fakelogin = function(callback) {
    // summary:
    //     This function simule a login on ozwillo acount.it is util to connet a app user to have acess to datacore and test.
	
	
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
	extend(options.headers,FirefoxHeader);
  //log.debug("login options : ", options);
  request(options, function(err, res, body) {
    if(err) {
      log.error("Remote error in login() : " + err);
      return;
    }
	 // log.debug("login code:"+res.statusCode);
	// log.debug("login statusMessage:"+res.statusMessage);
  // log.debug("login res headers : ", res.headers);

	  
    callback();
  });
};



FakeLogin.getCodeFromKernel = function(callback) {
    // summary:
    //     This funtion can get the Code from the kernel see OAuth2.0
		
	var Authrequest = Connection.requestAuth({prompt:"consent"});
	var nonce  = Authrequest.nonce; 
	
	
	
  var options = {
    rejectUnauthorized: false,
    url: Authrequest.url,
    method: 'GET',
    followAllRedirects: false, // don't redirect to be able to extract code from Location header
    headers: {
		 /*'Host': 'accounts.ozwillo-preprod.eu',*/
      referer: conf.kernelBaseUrl + '/a/login',
    },
	 jar : true
  };

	extend(options.headers,FirefoxHeader);
	
	//log.debug("getCodeFromKernel params : ", options);
  
  request(options, function(err, res, body) {
    // TODO approve if asked to
    if(err) {
      log.error("Remote error getCodeFromKernel : " + err);
      return;
    }
 //	log.debug("getCodeFromKernel res headers: ", res.headers);
	   //log.debug("getCodeFromKernel code:"+res.statusCode);

	  
	  
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
				referer: Authrequest.url,
			 },
			 jar : true,
				qsParseOptions:{indices: false},
				qsStringifyOptions:{indices: false},
			 form: {
				_utf8: '☃', 
				client_id: conf.app_client_id,
				/*client_secret: conf.app_client_secret,*/
				scope:  ('openid profile '+conf.additionalScope) .split(" "),
				redirect_uri: conf.redirect_uri,
				/*state: 'a',*/
				'state':'security_token%253D25%2526url%253Dhttps%253A%252F%252Flocalhost%25home',
				nonce:nonce
			 }

		  };	  
		  
		  extend(options2.headers,FirefoxHeader);
		  

				request(options2, function(err, res, body) {
					
					
					ReponceAuth(err,res,body,callback);
					
				});
		  return;
	  }
	  ReponceAuth(err,res,body,callback);
	  
	  
	  function ReponceAuth(err,res,body,callback)
	  {
		  
		  if(err) {
						log.error("Remote error getCodeFromKernel : " + err);
						return;
					 }
				//log.debug("getCodeFromKernel res body: ", res.body);

			 // log.debug("\n\n");




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
		//	 log.debug("getCodeFromKernel body: ", body);

			 callback(code);
	  }
	  
	  

  });
};




FakeLogin.getToken_pure = function(code, callback) {
	
	    // summary:
    //     With the code we can recup the token
	//log.debug("AQUISITION DU TOKEN\n\n");

	Connection.getTokenOauth(code, function(err, token,id_token,tokenobj) {

    if(err) {
     log.error("Remote error in getToken() : " + err);
      return;
    }

    //log.debug("getToken body ", JSON.stringify(tokenobj,null,' '));
    callback(token,id_token,tokenobj);
  });	
									 
};


FakeLogin.getToken = function(callback) {
	
	    // summary:
    //     This funtion recup a token and send it to callback this is the main function of FakeLogin
	
	FakeLogin.Fakelogin(function (){
		 FakeLogin.getCodeFromKernel(
			function (code){
					
					  FakeLogin.getToken_pure(code, function(token,id_token,tokenobj) {           
						 log.debug('**********TOKEN**********');
						  log.debug(util.inspect(tokenobj));
						 log.debug('**********TOKEN**********\n');
						callback(token,id_token,tokenobj);
					});
			});
			});
}
