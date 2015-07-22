	// summary:
	// this module offer funtionality to merger your data with dacaore data: we try to merge your mongodb base and dacorebase






var log;
var request; 
var conf;
var databaseload = false;
var parent;
var CronJob;
var mongoose;
var util = require('util');
var db ;
MongoServiceMerge = module.exports = function(obj)
{

	log=obj.log;
	request=obj.request;
	conf=obj.conf;
	parent = obj.parent;

	/*CronJob = require('cron').CronJob;
new CronJob('0 0 * * * *', function() {
  MergeData();
}, null, true, 'Europe/Paris');*/

	mongoose = require('mongoose');
	//mongoose.connect('mongodb://'+(conf.databaseaddr || '127.0.0.1')+'/'+(conf.databasename || 'mongobase'));
	mongoose.connect('mongodb://'+(conf.databaseaddr || '127.0.0.1')+'/'+(conf.databasename || 'mongobase'),function(err) {if (err) { throw err; }});

	db = mongoose.connection;
	db.on('error', function(err){log.error('connection error:'+err)});

	log.debug('lauch mongoose');
	db.once('open', function (callback) {
		databaseload=true;
		log.debug('dadabase open');	
	});

	MongoServiceMerge.mongoose = mongoose;

	return MongoServiceMerge;	
};

MongoServiceMerge.setconf =  function(conff)
{
conf=conff;
}




var DCModelList = [];
MongoServiceMerge.AddDatacoreModel =  function(name,shema)
{	// summary:
	// 			Use this function add model on your mongoose which be merge with datacore.
	// shema : 
	//         must contain    '@id'   : { type: String ,unique:true,required:true}
	// and  'o:version'    : Number 

	if(DCModelList.lastIndexOf(name)==-1)
	{
		log.debug('add '+name+' to model')
		DCModelList.push(name);
		mongoose.model(name, shema);
	}

}


MongoServiceMerge.PostDataCore = function(model,data,callback)
{
	var datacore = {};
	MongoServiceMerge.MongooseToDatacore(model,data,datacore);

	
	parent.Fakelogin.getToken(function (token){
	
	log.debug("POST:"+JSON.stringify(datacore));
	log.debug('modelName:'+model.modelName);
		OpenHour.OzwilloUtil.PostRequest(token,model.modelName,'','oasis.sandbox',JSON.stringify(data),function(err,body){
		
		if(err)console.log("err in post data datacore: "+err+" :"+body);
		if(callback)
		callback(err);
		
		});
	});
}



function copyitem(model,from,to,todatacore){
	model.schema.eachPath(
		function(key)
		{
			if(key == '_id' || key=='__v' || key[0]=='_')
				return;
			if(model.schema.paths[key].instance=='Mixed')
			{
				if(from[key])
				{
				if(todatacore)
				to[key]=JSON.stringify(from[key]);
				else
				to[key]=JSON.parse(from[key]); 
				}
			}
			else
			{
				if(from[key])
				to[key]=from[key];
			}

		});
}

MongoServiceMerge.MongooseToDatacore= function(model,mongoose,datacore)
{
copyitem(model,mongoose,datacore,1);
}
MongoServiceMerge.DatacoreToMongoose = function(model,datacore,mongoose)
{
copyitem(model,datacore,mongoose,0);
}

MongoServiceMerge.MergeData = function (debug)
{
	
	// summary: 
	//         this funtion merga data with datacore
	//				it list model add with AddDatacoreModel
	//				and merge exiting data(it take the lastest vertion)
	//          and crete in your database the data that exist on datacore
	//  today we use developer accese on datacore it must be modified to use app acour and Fakelogin.
	
	
	//  Warning the funtion do not create data on datacore on modify your database
	
	
	
	/**/
	/*	TODO */ 
	
	parent.Fakelogin.getToken(function (token){
	
	log.debug('Merge data begin : '+DCModelList);	
	for(var m of DCModelList)
	{

		//pour chaque resource du datacore du model m

		//var idModel=conf.datacoreUrl+'/dc/type/dcmo:model_0/'+m;

		//on retrouve les donner corespondant au model
		//TODO ??
		log.debug('Merge model :'+m+'\n');		
		parent.GetRequestModel(token,m,'','oasis.sandbox',
			 function(err,dataCoreResource)
			 {
			if(err){return;} 

			//log.debug('dacacoreresurce:'+util.inspect(dataCoreResource));
			for(var r of dataCoreResource)
			{
				//var r= dataCoreResource[0];
				log.debug('Merge resource :'+r['@id']+'\n');	
				//on compare les vertion des donné
				// on merge en cas de besoin
				var mondodbmodel = mongoose.model(m);
				mondodbmodel.findOne({'@id':r['@id']},
											function(err,datamongo){	

					if(err){log.error('error : '+err);return;}

					//log.debug(datamongo);
					if(datamongo == null)//not found we add him
					{
						log.debug('resource not found in mongodB:'+r['@id']+'\n');	

						var instance = new mondodbmodel();
						

						MongoServiceMerge.DatacoreToMongoose(mondodbmodel,r,instance);
						
						if(debug)
						{
						log.debug(util.inspect(instance));
						}
						else
						instance.save(function (err) {
							if(err)
								log.error(err);
							return;
						});
						return;
					}
					else
					{
						if(r['o:version']>datamongo['o:version'])//datacore plus ajour
						{
							log.debug('our resource is older');

							MongoServiceMerge.DatacoreToMongoose(mondodbmodel,r,instance);
							if(debug)
							{
							log.debug(util.inspect(datamongo));
							}
							else
							datamongo.save(function (err) {
								if(err)log.error(err);
								return;
							});
						}
						else if(r['o:version']<datamongo['o:version'])
						{
							log.debug('our resource is newer');	
							var datalaunch =	{};

							MongoServiceMerge.MongooseToDatacore(mondodbmodel,datamongo,datalaunch);
							
							datalaunch['@id'] = r['@id'];
							datalaunch['o:version']= r['o:version'];
							
							log.debug('we launch :'+util.inspect(datalaunch)+"\n in  string: "+JSON.stringify(datalaunch));	
						
							
							if(debug)
							{
							}
							else	
							parent.PutRequest(token,m,'','oasis.sandbox',JSON.stringify(datalaunch),
														function(err,body)
														{
														if(err){log.error(err+" : "+body);return;}
														log.debug(util.inspect(body));
								return;
							});
						}
						else{
							log.debug('our resource is uptodate');
							/*nothing to do*/}

					}

				}
				);

			}
		});//now all data we existe in datacore isuptodate now merge our data with the data core(note this is idiot and very hard...)
		// when we add data to mongo is automaticelle add to datacore...
		
		
		
		
		
		

	}
	});

}