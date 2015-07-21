/*jslint node: true */
// Use : ex. node token.js ./config-prod.json (mind the ./)


/* this module : 
- use fake login to ozwillo to have a token (for debug your appli)
- can connec you to ozwilo
- offer mongodb merger with you data on the datacore 
*/


var active;
var util = require('util');
var log4js = require('log4js');
var log = log4js.getLogger();
log.setLevel('DEBUG');
var request = require('request');
require('request-debug')(request);
var request = request.defaults({jar: true});
var conf = require('./config.json');
var cacheManager = require('cache-manager');
var memoryCache = cacheManager.caching({store: 'memory', max: 100, ttl: 10/*seconds*/});


module.exports.Fakelogin ={};
module.exports.MongoServiceMerge={};
module.exports.Connection={};
mo = module.exports = function(activate)
{
	// activate:
	// activate is a objet with 3 atribut on false or true :
	// -Fakelogin : ta load Fakelogin
	// - Connection : to load Connection
	// - MongoServiceMerge : to load the merge service with mongo db
	
active=activate;
active.Fakelogin = active.Fakelogin || false;
if(active.Fakelogin)
active.Connection = true;
else	
active.Connection = active.Connection || false;	
active.MongoServiceMerge = active.MongoServiceMerge || false;	

log.debug('we have:'+util.inspect(active));	

if(active.Connection)
{
module.exports.Connection = require('./ConnectionOzwillo')({log: log, conf:conf, request:request});
}
if(active.Fakelogin)
{
module.exports.Fakelogin = require('./Fakelogin')({log: log, conf:conf, request:request,Connection:module.exports.Connection});
}
if(active.MongoServiceMerge)
	{
	//	log.debug('MongoServiceMerge loading');
	
	module.exports.MongoServiceMerge = require('./MongoMerge')({log: log, conf:conf, request:request,parent:module.exports});
	//log.debug('MongoServiceMerge loaded :');
	 
	}	
return module.exports;
}	



/**
confile is a json file like this:
{
    "login": "le login a simuler",
    "password": "password of account to connect",
    "app_client_id": "dc",
    "app_client_secret": "password",
    "dc_client_id": "dc",
    "dc_client_secret": "password",
    "kernelBaseUrl": "https://accounts.ozwillo-dev.eu",
    "redirect_uri" : "https://data.ozwillo-dev.eu/dc/playground/token",
    "datacoreTestUrl": "https://data.ozwillo-dev.eu/dc/type/pli:city_0"
}

*/
mo.setconf = function(confile)
{
	conf = null;
	conf = require(confile);
	//log.debug("new conf:"+util.inspect(conf));
	if(active.Connection)
	mo.Connection.setconf(conf);
	if(active.Fakelogin)
	mo.Fakelogin.setconf(conf);
	if(active.MongoServiceMerge)
	mo.MongoServiceMerge.setconf(conf);
	
		log.debug('loading conf ' + confile);
}




mo.getUserInfo = function(token, callback) {
	// summary :
	// this funtion return some info about the user 
	//
	// token : 
	//  			of course we need the token of the user
	//	callback :
	//				function who take the responce from the serveur
	//
	
  var options = {
    rejectUnauthorized: false,
    url: conf.kernelBaseUrl + '/a/userinfo',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/json'
    }
  };
  
  request(options, function(err, res, body) {
    if(err) {
      log.error("Remote error in testToken() : " + err);
		 callback(1,err);
      return;
    }
     log.debug('Should display information about the user:');
     log.debug(body+'\n');
	  callback(0,JSON.parse(body));
  }
			 );
};


mo.getTokenInfo = function(token, callback) {
	// summary :
	// this funtion return some info about the user 
	//
	// token : 
	//  			of course we need the token of the user
	//	callback :
	//				function who take the responce from the serveur
	//
	
	
	var appBasicAuth = 'Basic ' + new Buffer(conf.app_client_id + ':' + conf.app_client_secret).toString("base64");
	
	
  var options = {
    rejectUnauthorized: false,
    url: conf.kernelBaseUrl + '/a/tokeninfo',
    method: 'POST',
    headers: {
       'Authorization': appBasicAuth,
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body : 'token' +'='+token
    	
    
    
  };
  
  request(options, function(err, res, body) {
    if(err) {
      log.error("Remote error in getTokenInfo() : " + err);
		 callback(1,err);
      return;
    }
    log.debug(res.headers+' '+res.statusCode+'\n'+res.statusMessage);
     log.debug('Should display information about the Token:');
     log.debug(body+'\n');
     if(body!="")
	  callback(0,JSON.parse(body));
	  else log.error("eroor");
  }
			 );
};


function GetRequest_priv(Authorization,url,project,callback)
{

  request({
    rejectUnauthorized: false,
    url: conf.datacoreTestUrl+url,
    method: 'GET',
    headers: {
      'Authorization': Authorization,
      'Accept': 'application/json',
		'X-Datacore-Project' : 'oasis.'+project
    }
  }, 
		function(err, res, body) {
		 if(err) {
			log.error("Remote error in GetRequest() : " + err);
			callback(true,'');
		 }
		 if(res.statusCode == 404 || res.statusCode == 400)
		 {
		 log.error("Bad request : " + res.body);
			 callback(true,JSON.parse(body));
		 }
		 else if(res.statusCode == 200)
		 callback(false,JSON.parse(body));
	  		else {log.error("Bad codce : " + res.statusCode+' : '+res.body);
				  callback(false,'');
				  }
  				});
};

			 
/*Returns all Datacore resources of the given Model type that match all (AND)criteria provided in HTTP query parameters, sorted in the given order(s) if any, with (limited) pagination. */
mo.GetRequestModel = function(token,url,arg,project,callback)
{
	memoryCache.wrap(url+arg+project, function (cacheCallback) {
			  GetRequest_priv('Bearer ' + token,'/dc/type/'+url+'?'+arg,project,cacheCallback);
		 }, {ttl: 5}, callback);
};


mo.GetRequestTypeAPP = function(basic,url,arg,project,callback)
{
	
	// summary:
	// this funtion make a request on datacore (/dc/type) but use basci autheitfication for debug(deprecated)
	//
	
	
	memoryCache.wrap(url+arg+project, function (cacheCallback) {
			  GetRequest_priv('Basic ' + basic,'/dc/type/'+url+'?'+arg,project,cacheCallback);
		 }, {ttl: 5}, callback);
};



  



/*Returns all Datacore resources of the given type that match all (AND)criteria provided in HTTP query parameters, sorted in the given order(s) if any, with (limited) pagination.It is a 'native' query in that it isimplemented as a single MongoDB query with pagination by default. */
mo.GetRequesttype = function(token,url,arg,project,callback)
{
	memoryCache.wrap(url+arg+project, function (cacheCallback) {
			  GetRequest_priv('Bearer ' + token,'/dc/'+url+'?'+arg,project,cacheCallback);
		 }, {ttl: 5}, callback);
};

/*Returns all Datacore resources of the given Model type that match all (AND)criteria provided in HTTP query parameters, sorted in the given order(s) if any, with (limited) pagination. */
mo.GetRequestModelSpecific = function(token,url,uri,arg,project,callback)
{
	memoryCache.wrap(url+uri+arg+project, function (cacheCallback) {
			  GetRequest_priv('Bearer ' + token,'/dc/type/'+url+'/'+uri+'?'+arg,project,cacheCallback);
		 }, {ttl: 5}, callback);
};

mo.GetRequestModelDef = function(token,url,uri,arg,project,callback)
{
	memoryCache.wrap(url+uri+arg+project, function (cacheCallback) {
			  GetRequest_priv('Bearer ' + token,'/dc/type/dcmo:model_0/'+url+'/'+uri+'?'+arg,project,cacheCallback);
		 }, {ttl: 5}, callback);
};
mo.GetRequestMixInDef = function(token,url,uri,arg,project,callback)
{
	memoryCache.wrap(url+uri+arg+project, function (cacheCallback) {
			  GetRequest_priv('Bearer ' + token,'/dc/type/dcmi:mixin_0/'+url+'/'+uri+'?'+arg,project,cacheCallback);
		 }, {ttl: 5}, callback);
};

function PostRequest_priv(token,url,project,data,callback)
{

  request({
    rejectUnauthorized: false,
    url: conf.datacoreTestUrl+url,
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/json',
		'X-Datacore-Project' : 'oasis.'+project
    },
	 body : data 
  }, 
		function(err, res, body) {
    if(err) {
      log.error("Remote error in PostRequest() : " + err);
			callback(true,'');
		 }
		 if(res.statusCode == 404 || res.statusCode == 400 || res.statusCode == 200 || res.statusCode == 500 ||res.statusCode == 409 )
		 {
		 log.error("Bad request : " + body);
			 callback(true,JSON.parse(body));
		 }
		 else if(res.statusCode == 201)
		 callback(false,JSON.parse(body));

  				});
};

mo.PostRequest = function(token,url,arg,project,data,callback)
{
 
PostRequest_priv(token,'/dc/type/'+url+'/'+'?'+arg,project,data,callback);
};

mo.PostRequestModel = function(token,url,arg,project,data,callback)
{
 
PostRequest_priv(token,'/dc/type/dcmo:model_0/'+url+'/'+'?'+arg,project,data,callback);
};

function PutRequest_priv(auth,url,project,data,callback)
{

  request({
    rejectUnauthorized: false,
    url: conf.datacoreTestUrl+url,
    method: 'PUT',
    headers: {
      'Authorization': auth,
      'Accept': 'application/json',
		'X-Datacore-Project' : 'oasis.'+project
    },
	 body : data 
  }, 
			 function(err, res, body) {
    if(err) {
      log.error("Remote error in PutRequest() : " + err);
			callback(true,'');
		 }
		 if(res.statusCode == 500 || res.statusCode == 409 || res.statusCode == 404 || res.statusCode == 400)
		 {
		 log.error("Bad request : " + body);
			 callback(true,JSON.parse(body));
		 }
		 else if(res.statusCode == 200)
		 callback(false,JSON.parse(body));

  				});

  		
};


mo.PutRequest = function(token,url,arg,project,data,callback)
{
 
PutRequest_priv('Bearer '+token,'/dc/type/'+url+'/'+'?'+arg,project,data,callback);
};

mo.PutRequestAPP = function(basic,url,arg,project,data,callback)
{
 
PutRequest_priv('Basic '+basic,'/dc/type/'+url+'/'+'?'+arg,project,data,callback);
};

mo.PutRequestModel = function(token,url,arg,project,data,callback)
{
 
PutRequest_priv('Bearer '+token,'/dc/type/dcmo:model_0/'+url+'/'+'?'+arg,project,data,callback);
};

function DelRequest_priv(token,url,project,callback)
{

  request({
    rejectUnauthorized: false,
    url: conf.datacoreTestUrl+url,
    method: 'DELETE',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/json',
		'X-Datacore-Project' : 'oasis.'+project
    },
	 body : data 
  }, 
			 function(err, res, body) {
    if(err) {
      log.error("Remote error in PutRequest() : " + err);
		callback(true,'');
		 }
		 if(res.statusCode == 409 || res.statusCode == 404 || res.statusCode == 400)
		 {
		 log.error("Bad request : " + body);
			 callback(true,JSON.parse(body));
		 }
		 else if(res.statusCode == 204)
		 callback(false,JSON.parse(body));

  				});
};
mo.DELRequest = function(token,url,arg,project,callback)
{
 
DelRequest_priv(token,'/dc/type/'+url+'/'+'?'+arg,project,callback);
};
mo.DELRequestModel = function(token,url,arg,project,callback)
{
 
DelRequest_priv(token,'/dc/type/dcmo:model_0/'+url+'/'+'?'+arg,project,callback);
};
/*
function Baserequest(token,url,project,method,callback)
{

  request({
    rejectUnauthorized: false,
    url: conf.datacoreTestUrl+url,
    method: method,
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/json',
		'X-Datacore-Project' : 'oasis.'+project
    }
  }, 
			 function(err, res, body) {
    if(err) {
      log.error("Remote error in testToken() : " + err);
      return;
    }
	 callback(JSON.parse(body));

}

*//*




mo.getinfo = function(token,project,info, callback) {

  
  request({
    rejectUnauthorized: false,
    url: conf.datacoreTestUrl+info,
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/json',
		'X-Datacore-Project' : 'oasis.'+project
    }
  }, function(err, res, body) {
    if(err) {
      log.error("Remote error in testToken() : " + err);
      return;
    }
    log.debug('Should display information about Datacore Resource ' + conf.datacoreTestUrl + ':');
    log.debug(body);
	  callback(JSON.parse(body));

});
};*/






