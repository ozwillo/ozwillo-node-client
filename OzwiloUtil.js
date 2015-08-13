/*jslint node: true */

// In this module you can find : 
// Fakelogin : to get a token automatically
// Connection : help to get a token from a connected user to ozwillo
// MongoServiceMerge : thanks to mongoose , the mopdule offer mongodb merger with you data on the datacore.

var active;
var util = require('util');
var log4js = require('log4js');
var log = log4js.getLogger();
log.setLevel('DEBUG');
var request = require('request');
var http = require('http');
http.Agent({keepAlive:false});
http.globalAgent.maxSockets = 25;

var extend = require('extend');
//require('request-debug')(request);
var request = request.defaults({
	jar: true
});
var ReadWriteLock = require('locks');
var conf = require('./config.json');
var cacheManager = require('cache-manager');
var memoryCache = cacheManager.caching({
	store: 'memory',
	max: 100,
	ttl: 60 /*seconds*/
});
var extend = require('extend');

module.exports.Fakelogin = {};
module.exports.MongoServiceMerge = {};
module.exports.Connection = {};
module.exports.ReadWriteLock = ReadWriteLock;
mo = module.exports = function(active2) {
	// active:
	// active is a objet with 3 atribut on false or true :
	// - Fakelogin : ta load Fakelogin
	// - Connection : to load Connection
	// - MongoServiceMerge : to load MongoServiceMerge
	
	active = active2 || {};
	active.Fakelogin = active.Fakelogin || false;
	if (active.Fakelogin)
		active.Connection = true;
	else
		active.Connection = active.Connection || false;
	active.MongoServiceMerge = active.MongoServiceMerge || false;

	active.onlylog = active.onlylog || false;
	
	// onlylog : active the debug mode and don't write on any database(datacore or mongodb)
	conf.onlylog = active.onlylog ;
	if(conf.onlylog)
	log.setLevel('DEBUG');
	
	log.debug('You choose : \n' + util.inspect(active));

	if (active.Connection) {
		module.exports.Connection = require('./ConnectionOzwillo')({
			log: log,
			conf: conf,
			request: request,
		});
	}
	if (active.Fakelogin) {
		module.exports.Fakelogin = require('./Fakelogin')({
			log: log,
			conf: conf,
			request: request,
			Connection: module.exports.Connection,
			ReadWriteLock : ReadWriteLock
		});
	}
	if (active.MongoServiceMerge) {
		module.exports.MongoServiceMerge = require('./MongoMerge')({
			log: log,
			conf: conf,
			request: request,
			parent: module.exports
		});
	}
	return module.exports;
}



/**
Confile is a path to a json  file like this:
{
    "login": "le login a simuler",
    "password": "password of account to connect",
    "app_client_id": "dc",
    "app_client_secret": "secret password",
    "dc_client_id": "dc",
    "dc_client_secret": "password",
    "kernelBaseUrl": "https://accounts.ozwillo-dev.eu",
    "redirect_uri" : "https://data.ozwillo-dev.eu/dc/playground/token",
    "datacoreUrl": "https://data.ozwillo-dev.eu/",
    "additionalScope" : "datacore email" 

}

*/
mo.setconf = function(confile) {
//	conf = null;
	conff = require(confile);
	extend(conf,conff);
	//log.debug("new conf:"+util.inspect(conf));
	if (active.Connection)
		mo.Connection.setconf(conf);
	if (active.Fakelogin)
		mo.Fakelogin.setconf(conf);
	if (active.MongoServiceMerge)
		mo.MongoServiceMerge.setconf(conf);

	log.debug('loading conf ' + confile);
}




mo.getUserInfo = function(token, callback) {
	// summary :
	// 					this funtion return some info about the user in callback see [doc.ozwillo.com](http://doc.ozwillo.com/)
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
		if (err) {
			log.error("Remote error in testToken() : " + err);
			callback(1, err);
			return;
		}
		log.debug('Should display information about the user:');
		log.debug(body + '\n');
		callback(0, JSON.parse(body));
	});
};


mo.getTokenInfo = function(token, callback) {
	// summary :
	// 					this funtion return some info about the user see [doc.ozwillo.com](http://doc.ozwillo.com/)
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
		body: 'token' + '=' + token



	};

	request(options, function(err, res, body) {
		if (err) {
			log.error("Remote error in getTokenInfo() : " + err);
			callback(1, err);
			return;
		}
		log.debug('getTokenInfo : ' + util.inspect(res.headers) + ' ' + res.statusCode + ' ' + res.statusMessage);
		log.debug('Should display information about the Token:');
		log.debug(body + '\n');
		if (body != "")
			callback(0, JSON.parse(body));
		else log.error("eroor");
	});
};


function GetRequest_priv(Authorization, url, project, headers_add, callback) {

	var headers = {
		'Authorization': Authorization,
		'Accept': 'application/json',
		'X-Datacore-Project': project
	};


	if (headers_add)
		extend(headers, headers_add);
	request({
			rejectUnauthorized: false,
			url: url,
			method: 'GET',
			headers: headers
		},
		function(err, res, body) {
			if (err) {
				log.error("Remote error in GetRequest() : " + err);
				callback(err, '');
			}
			else if (res.statusCode == 404 || res.statusCode == 400) {
				log.error("Bad request : " + res.body);
				callback(res, body);
			}
			else if (res.statusCode == 200)
				callback(null, JSON.parse(body));
			else {
				log.error("Bad code : " + res.statusCode+" : "+ url + ' : ' + res.body);
				callback(res.body,body);
			}
		});
};


// Returns all Datacore resources of the given Model type that match all (AND)criteria provided in HTTP query parameters, sorted in the given order(s) if any, with (limited) pagination. 
mo.GetRequestModel = function(token, url, arg, project, callback, head_add) {
// 
// url : is the url after /dc/type/ see the playground.
// arg : the argument after the ? in the request
// Projet : the projet in ozwillo oasis.sandbox by exemple
// callback (err,result)
// head_add : to add some hearder on the request
	
	memoryCache.wrap(url + arg + project, function(cacheCallback) {
		GetRequest_priv('Bearer ' + token, conf.datacoreUrl+'/dc/type/' + url + '?' + arg, project, head_add, cacheCallback);
	}, {}, callback);
};

// return a REsource with the spesified URI 
mo.GetRequestURI = function(token,URI, project, callback, head_add) {
// 
// url : is the url after /dc/type/ see the playground.
// arg : the argument after the ? in the request
// Projet : the projet in ozwillo oasis.sandbox by exemple
// callback (err,result)
// head_add : to add some hearder on the request
URI = URI || '';
URI = conf.datacoreUrl+URI.substring('http://data.ozwillo.com/'.length);
	
	
	memoryCache.wrap('' + URI + project, function(cacheCallback) {
		GetRequest_priv('Bearer ' + token, URI, project, head_add, cacheCallback);
	}, {
	}, callback);
};





mo.GetRequestTypeAPP = function(basic, url, arg, project, callback, head_add) {
// Deprecated !!!! 
	


	memoryCache.wrap(url + arg + project, function(cacheCallback) {
		GetRequest_priv('Basic ' + basic, conf.datacoreUrl+'/dc/type/' + url + '?' + arg, project, head_add, cacheCallback);
	}, {
	}, callback);
};


/*Returns all Datacore resources of the given type that match all (AND)criteria provided in HTTP query parameters, sorted in the given order(s) if any, with (limited) pagination.It is a 'native' query in that it isimplemented as a single MongoDB query with pagination by default. */
mo.GetRequesttype = function(token, url, arg, project, callback, head_add) {
// 
// Same as GetRequestModel but for directe uri
//
	memoryCache.wrap(url + arg + project, function(cacheCallback) {
		GetRequest_priv('Bearer ' + token, conf.datacoreUrl+'/dc/' + url + '?' + arg, project, head_add, cacheCallback);
	}, {
	}, callback);
};

/*Returns all Datacore resources of the given Model type that match all (AND)criteria provided in HTTP query parameters, sorted in the given order(s) if any, with (limited) pagination. */
mo.GetRequestModelSpecific = function(token, url, uri, arg, project, callback, head_add) {

// same as GetRequestModel	
	
	memoryCache.wrap(url + uri + arg + project, function(cacheCallback) {
		GetRequest_priv('Bearer ' + token, conf.datacoreUrl+'/dc/type/' + url + '/' + uri + '?' + arg, project, head_add, cacheCallback);
	}, {
	}, callback);
};

mo.GetRequestModelDef = function(token, url, uri, arg, project, callback, head_add) {
// same as GetRequestModel but to get a model definition	
	
	memoryCache.wrap(url + uri + arg + project, function(cacheCallback) {
		GetRequest_priv('Bearer ' + token, conf.datacoreUrl+'/dc/type/dcmo:model_0/' + url + '/' + uri + '?' + arg, project, head_add, cacheCallback);
	}, {
	}, callback);
};
mo.GetRequestMixInDef = function(token, url, uri, arg, project, callback, head_add) {
// same as GetRequestModel but to get a mixin model	
	
	
	memoryCache.wrap(url + uri + arg + project, function(cacheCallback) {
		GetRequest_priv('Bearer ' + token, conf.datacoreUrl+'/dc/type/dcmi:mixin_0/' + url + '/' + uri + '?' + arg, project, head_add, cacheCallback);
	}, {
	}, callback);
};

function PostRequest_priv(token, url, project, data, callback) {
//private funcion

	if(conf.onlylog)
	{
		log.debug("POST:"+conf.datacoreUrl + url);
		log.debug("token:"+token);
		log.debug("data:"+util.inspect(data))
	return;
	}
		
		
	request({
			rejectUnauthorized: false,
			url: conf.datacoreUrl + url,
			method: 'POST',
			headers: {
				'Authorization': 'Bearer ' + token,
				'Accept': 'application/json',
				'X-Datacore-Project': project,
				'content-type': 'application/json',
			},
			body: data
		},
		function(err, res, body) {
			if (err) {
				log.error("Remote error in PostRequest() : " + err + ' '+util.inspect(res));
				callback(true, '');
			}
			else if (res.statusCode == 404 || res.statusCode == 400 || res.statusCode == 200 || res.statusCode == 500 || res.statusCode == 409) {
				log.error("Bad request : " + body);
				callback(true, body);
				
			}
			else if (res.statusCode == 201)
				callback(false, JSON.parse(body));
			else {
				log.error("Bad Code : " + res.statusCode);
				callback('Bad Code ' + res.statusCode, body);
			}
		});
};

mo.PostRequest = function(token, url, arg, project, data, callback) {
// post data in datacore
// url : see GetRequestModel
// arg : see GetRequestModel
// projet : see GetRequestModel
// data : json object to send see Playground


	PostRequest_priv(token, '/dc/type/' + url + '/' + '?' + arg, project, data, callback);
};

mo.PostRequestModel = function(token, url, arg, project, data, callback) {
// like PostRequest but for model

	PostRequest_priv(token, '/dc/type/dcmo:model_0/' + url + '/' + '?' + arg, project, data, callback);
};

function PutRequest_priv(auth, url, project, data, callback) {


	
	log.debug("make PUT on :" + conf.datacoreUrl + url);
	log.debug("make PUT on with projet :" + project);
	log.debug("AND DATA:" + data);
		
	if(conf.onlylog)
	{
		/*log.debug("POST:"+conf.datacoreUrl + url);
		log.debug("token:"+token);
		log.debug("data:"+util.inspect(data))*/
	return;
	}
	
	
	request({
			rejectUnauthorized: false,
			url: conf.datacoreUrl + url,
			method: 'PUT',
			headers: {
				'Authorization': auth,
				'Accept': 'application/json',
				'content-type': 'application/json',
				'X-Datacore-Project': project
			},
			body: data
		},
		function(err, res, body) {
			if (err) {
				log.error("Remote error in PutRequest() : " + err);
				callback(err, '');
			}
			else if (res.statusCode == 500 || res.statusCode == 409 || res.statusCode == 404 || res.statusCode == 400) {
				log.error("Bad request : " + body);
				callback('Bad request', body);
			}
			else if (res.statusCode == 200)
				callback(false, JSON.parse(body));
			else {
				log.error("Bad Code : " + res.statusCode);
				callback('Bad Code ' + res.statusCode, body);
			}
		});


};


mo.PutRequest = function(token, url, arg, project, data, callback) {
// like PostRequest but put request for update
	PutRequest_priv('Bearer ' + token, '/dc/type/' + url + '/' + '?' + arg, project, data, callback);
};

mo.PutRequestAPP = function(basic, url, arg, project, data, callback) {
//deprecated
	PutRequest_priv('Basic ' + basic, '/dc/type/' + url + '/' + '?' + arg, project, data, callback);
};

mo.PutRequestModel = function(token, url, arg, project, data, callback) {
// like PutRequest but for model

	PutRequest_priv('Bearer ' + token, '/dc/type/dcmo:model_0/' + url + '/' + '?' + arg, project, data, callback);
};

function DelRequest_priv(token, url, project, callback) {

		
	if(conf.onlylog)
	{
		log.debug("POST:"+conf.datacoreUrl + url);
		log.debug("token:"+token);
	return;
	}
	
	request({
			rejectUnauthorized: false,
			url: conf.datacoreUrl + url,
			method: 'DELETE',
			headers: {
				'Authorization': 'Bearer ' + token,
				'Accept': 'application/json',
				'X-Datacore-Project': 'oasis.' + project
			},
			body: data
		},
		function(err, res, body) {
			if (err) {
				log.error("Remote error in PutRequest() : " + err);
				callback(true, '');
			}
			if (res.statusCode == 409 || res.statusCode == 404 || res.statusCode == 400) {
				log.error("Bad request : " + body);
				callback(true, body);
			}
			else if (res.statusCode == 204)
				callback(false, JSON.parse(body));

		});
};
mo.DELRequest = function(token, url, arg, project, callback) {
// Del request : delet a resource

	DelRequest_priv(token, '/dc/type/' + url + '/' + '?' + arg, project, callback);
};
mo.DELRequestModel = function(token, url, arg, project, callback) {
// like DEL but for Model

	DelRequest_priv(token, '/dc/type/dcmo:model_0/' + url + '/' + '?' + arg, project, callback);
};

/* thanks to mark*/
   var safeCharsRegexString = "0-9a-zA-Z" + "\\$\\-_\\.\\+!\\*'\\(\\)"; // "$-_.()" + "+!*'";
   var reservedCharsRegexString = "$&+,/:;=@" + "~"; // NOT ? and besides ~ is not encoded by Java URI
   var pathComponentSafeCharsRegex = new RegExp('[' + safeCharsRegexString + reservedCharsRegexString + ']');
mo.encodeUriPathComponent =   function (pathCpt) {
      var res = '';
      for (var cInd in pathCpt) {
         var c = pathCpt[cInd];
         res += pathComponentSafeCharsRegex.test(c) ? c : encodeURIComponent(c);
      }
      return res;
   }
 /**/


//This funcion try to get ALL !!!! REsource ID of a model /!\ Warging it can be very slow !!! do not use for ofen but sometime like by day
mo.GetRequestALLModelID = function(token, url, arg, project, callback, head_add) {
// 
// url : is the url after /dc/type/ see the playground.
// arg : the argument after the ? in the request
// Projet : the projet in ozwillo oasis.sandbox by exemple
// callback (err,result)
// head_add : to add some hearder on the request
	
	var async = require("async");
	arg=(arg || "")+'limit=250';
	var array = [];
	var next = true;
	var date = (new Date(Date.now())).toISOString();
	

	
	async.whilst(function(){return next;}, 
					function(callback)
					{
		
					GetRequest_priv('Bearer ' + token, conf.datacoreUrl+'/dc/type/' + url + '?' + arg+"&dc:modified=<"+encodeURIComponent(date), project, {'X-Datacore-View':'dc:modified'}, 
								 function(err,body)
								 {
									if(err)
									{
									next=false;
									log.error("error in GetRequestALLModelID: "+err);
										callback(1);
									return;
									}
									//log.debug("PASS WITH DATE : "+date);
									//log.debug("ADD: "+body.length +" ELEMENT");
									array = array.concat(body);
									if(body==[] || body.length ==0)
									next=false;
									else
									date = body[body.length-1]["dc:modified"];
									callback(0);
								  });
		
					}
					, function(err){callback(err,array);});
	
	
	


};



mo.memoryCache = memoryCache;



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

*/
/*




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
