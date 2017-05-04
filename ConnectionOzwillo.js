/*jslint node: true */

// summary:
//   This module is here to manage the connection of a user on ozwillo is simply use oauth2-simple well configure with config.json
//
// how it work ?
//
// Firt the application want a user to be auttentified, see requestAuth() after ozwillo repond to  conf.redirect_uri you need to redirect this responce to CallbackCode() which return the code , with the code use getTokenOauth to have the token.

var log;
var request 
var conf;

var oauth2;
var util= require("util");
var extend = require('extend');


Connection = module.exports =function(obj)
{

log=obj.log;
request=obj.request;
conf=obj.conf;

oauth2 = require('simple-oauth2').create(getCredentialsConf(conf));
	
	return Connection;	
};

function getCredentialsConf(conf) {

    return {
        client: {
            id: conf.app_client_id,
            secret: conf.app_client_secret
        },
        auth: {
            tokenHost: conf.kernelBaseUrl,
            authorizePath: '/a/auth',
            tokenPath: '/a/token',
            revokePath: 'a/revoke'
        },
        options: {
            useBasicAuthorizationHeader: true
        }
    }
}

function GETauthorizeURL()
{
	return {
		  redirect_uri: conf.redirect_uri,
		  response_type : 'code',
        scope : 'openid profile '+((conf.additionalScope) ? conf.additionalScope : "" ),
        state : conf.state | 'http://localhost/',
        nonce : Math.round(Math.random()*Math.pow(10,15)) //to int
		//prompt:"consent"
		};

}


Connection.setconf = function(conff)
{
	delete oauth2;
	conf=conff;
	oauth2 = require('simple-oauth2').create(getCredentialsConf(conf));
}


Connection.requestAuth = function(plus)
{
	
  // summary:
  //     this funtion return the url to redirect the user who want to be connected
  // return the url and the nonce parameter 
	
	log.debug("demande d'autentification connection to ozwillo\n");
	var tmp=GETauthorizeURL();
	extend(tmp, plus);
	return {url:oauth2.authorizationCode.authorizeURL(tmp),nonce:tmp.nonce};
};

Connection.CallbackCode = function(req)
{
	if(req.originalUrl.indexOf("error")>-1)
			{
			log.error("error");	
			log.error(req.originalUrl);
			return 0;
			}
	
	 return req.query.code;

};
Connection.getTokenOauth = function(code,callbackToken)
{

		  oauth2.authorizationCode.getToken({
			 code: code,
			 redirect_uri: conf.redirect_uri,
			  grant_type: 'authorization_code'
			  
		  }, saveToken);

		  function saveToken(error, result) {
			 if (error) { 
				 log.error('Access Token Error', error.message,result);
				 callbackToken(1,error.message); 
				 return; 
			 }

			 var token = oauth2.accessToken.create(result);
			  callbackToken(0,token.token.access_token,token.token.id_token,token);
		
		  }


};
Connection.logout = function(token,id_token,redirect)
{
	log.debug("log out !!!");
var tokenobj ={  
 'access_token': token,
  'id_token': id_token,
  };

var tokenoauth =  oauth2.accessToken.create(tokenobj);
	
	tokenoauth.revoke('access_token', function(error) {
	log.debug("revoke token!!!");

	});
	redirect.redirect(conf.kernelBaseUrl+'/a/logout?id_token_hint='+id_token+'&post_logout_redirect_uri='+conf.redirect_uri);
};


