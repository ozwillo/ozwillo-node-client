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
var authorization_uri;
var oauth2;
var util= require("util");

Connection = module.exports =function(obj)
{

log=obj.log;
request=obj.request;
conf=obj.conf;

oauth2 = require('simple-oauth2')(GETconfOauth2());
authorization_uri=GETauthorizeURL();
	
	return Connection;	
};











function GETconfOauth2()
{

 return {
		  clientID: conf.app_client_id,
		  clientSecret: conf.app_client_secret,
		  site: conf.kernelBaseUrl,
	     useBasicAuthorizationHeader : true,
		  authorizationPath: '/a/auth',
		  tokenPath: '/a/token',
	 	  revocationPath:'a/revoke'
		};


}





function GETauthorizeURL()
{
	return oauth2.authCode.authorizeURL({
		  redirect_uri: conf.redirect_uri,
		  response_type : 'code',
        scope : 'openid profile '+((conf.additionalScope) ? conf.additionalScope : "" ),
        state : 'security_token%3D25%26url%3Dhttps%3A%2F%2Flocalhost%home',
        nonce : '12',
		//prompt:"consent"
		});
}












Connection.setconf = function(conff)
{
	delete oauth2;
	conf=conff;
	oauth2 = require('simple-oauth2')(GETconfOauth2());
	authorization_uri=GETauthorizeURL();
}


Connection.requestAuth = function(res)
{
	
  // summary:
  //     Call this funtion when you want tha a user to be connect
  // res :
  // to send responce to user : like expresse res.
	
	log.debug("demande d'autentification connection to ozwillo\n");
	res.redirect(authorization_uri);
};

Connection.CallbackCode = function(req)
{
	if(req.originalUrl.indexOf("error")>-1)
			{
			log.error("error");	
			log.error(req.originalUrl);
			return ;
			}
	
	 return req.query.code;
	
	
	
};
Connection.getTokenOauth = function(code,callbackToken)
{

		  oauth2.authCode.getToken({
			 code: code,
			 redirect_uri: conf.redirect_uri, // 'https://data.ozwillo-dev.eu/dc/playground/token',
			  grant_type: 'authorization_code'
			  
		  }, saveToken);

		  function saveToken(error, result) {
			 if (error) { log.error('Access Token Error', error.message,result);callbackToken(1,error.message); return; }

			 token = oauth2.accessToken.create(result);
			   log.debug("token "+util.inspect(token));
			  callbackToken(0,token.token.access_token,token.token.id_token);
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
	
	redirect.redirect('https://accounts.ozwillo-dev.eu/a/logout?id_token_hint='+id_token+'&post_logout_redirect_uri='+conf.redirect_uri);
	
};


