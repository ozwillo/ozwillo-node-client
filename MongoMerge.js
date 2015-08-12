	// summary:
	// this module offer funtionality to merger your data with dacaore data:
	// we try to merge your mongodb base and dacorebase


var log;
var request; 
var conf;
var databaseload = false;
var parent;
var CronJob;
var mongoose;
var extend_mongoose;
var util = require('util');
var db ;
var async = require("async");
MongoServiceMerge = module.exports = function(obj)
{

	log=obj.log;
	request=obj.request;
	conf=obj.conf;
	parent = obj.parent;


	mongoose = require('mongoose');
	extend_mongoose = require('mongoose-schema-extend');
	
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

	if(!name)
	{
		log.error('AddDatacoreModel: must contain a name');
		return;
	}

	if(DCModelList.lastIndexOf(name)==-1)
	{
		log.debug('add '+name+' to model')
		DCModelList.push(name);
		mongoose.model(name, shema);
	}

}


MongoServiceMerge.PostDataCore = function(token,model,data,callback)
{
	// This function convert your data (a object in mongoose) in datacore object and post it on datacore.  
	//
	callback = callback || function(){};
	if(!model){log.error("Besoin d'un model"); callback("Need a model");return;  }
	
	var datacore = {};
	MongoServiceMerge.MongooseToDatacore(model,data,datacore);

	
	
	log.debug("POST:"+JSON.stringify(datacore));
	log.debug('modelName:'+model.modelName);
		parent.PostRequest(token,model.modelName,'','oasis.sandbox',JSON.stringify(datacore),function(err,body){
		
		if(err)log.error("err in post data datacore: "+err+" :"+body);
		if(callback)
		callback(err);
		
		});
	
}
MongoServiceMerge.PutDataCore = function(token,model,data,callback)
{
	// This function convert your data (a object in mongoose) in datacore object and PUT it on datacore.  
	//
	callback = callback || function(){};
	if(!model){log.error("Besoin d'un model"); callback("Need a model");return;  }
	
	var datacore = {};
	MongoServiceMerge.MongooseToDatacore(model,data,datacore);

	
	
	log.debug("PUT:"+JSON.stringify(datacore));
	log.debug('modelName:'+model.modelName);
		parent.PutRequest(token,model.modelName,'','oasis.sandbox',JSON.stringify(datacore),function(err,body){
		
		if(err)log.error("err in Put data datacore: "+err+" :"+body);
		if(callback)
		callback(err);
		
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
// convert a moogose object to datacore object
copyitem(model,mongoose,datacore,1);
}
MongoServiceMerge.DatacoreToMongoose = function(model,datacore,mongoose)
{
// convert a datacore object to mongoose object	
copyitem(model,datacore,mongoose,0);
}

MongoServiceMerge.MergeData = function (debug)
{
	
	if(conf.onlylog)
	debug = true;
	
	// summary: 
	//         this funtion merga data with datacore
	//			it list model add with AddDatacoreModel
	//			and merge exiting data we use verstion field
	//  This funcion do not post data on datacore but only make update and postg on mongodb locale.
	
	
	
	/**/
	/*	TODO */ 
	
	parent.Fakelogin.getTokenKeepInMind(function (token){
	
	log.debug('Merge data begin : '+DCModelList);	
	for(var m of DCModelList)
	{

		//pour chaque resource du datacore du model m

		//var idModel=conf.datacoreUrl+'/dc/type/dcmo:model_0/'+m;

		//on retrouve les donner corespondant au model
		
		(function(m){
		log.debug('Merge model :'+m+'\n');		//TODO MUST MUST THE INVERSE WE MUST "FOR" THE MONDODB and UPDATE DATACORE NOT "FOR" DATACORE  OR NOT ???
		parent.GetRequestALLModelID(token,m,'','oasis.sandbox',
			 function(err,dataCoreResource)
			 {
			if(err){return;} 

							log.debug("FUSION DE "+dataCoreResource.length+" ELEMENT");
			//log.debug('dacacoreresurce:'+util.inspect(dataCoreResource));
			async.eachLimit(dataCoreResource,25,
			function(r,done)
			{
				

				
				
				(function (r){
				//var r= dataCoreResource[0];
				
				//on compare les vertion des donné
				// on merge en cas de besoin
				var mondodbmodel = mongoose.model(m);
				mondodbmodel.findOne({'@id':r['@id']},
											function(err,datamongo){	
					log.debug('TEST :'+r['@id']);
					
					if(err){log.error('error with '+r['@id']+' : '+err);done(err);return;}

					//log.debug(datamongo);
					if(datamongo == null)//not found we add him
					{
						
						parent.GetRequestURI(token,r['@id'],'oasis.sandbox',function(err,r){
								if(err){return;}
							log.debug('resource not found in mongodB:'+r['@id']+'\n');	
	
							var instance = new mondodbmodel();
							
	
							MongoServiceMerge.DatacoreToMongoose(mondodbmodel,r,instance);
							
							if(debug)
							{
							log.debug(util.inspect(instance));
							}
							else
							{
								instance.save(function (err) {
									if(err)
										log.error(err);
									return;
								});
							}
							done();
						});
						return;
					}
					else
					{
						if(r['o:version']>datamongo['o:version'])//datacore plus ajour
						{
							log.debug('our resource is older : '+r['@id']);

							parent.GetRequestURI(token,r['@id'],'','oasis.sandbox',function(err,r){
							MongoServiceMerge.DatacoreToMongoose(mondodbmodel,r,datamongo);
							if(debug)
							{
							log.debug(util.inspect(datamongo));
							}
							else
							datamongo.save(function (err) {
								if(err)log.error(err);
								return;
							});
							done();	
							});
						}
						else if(r['o:version']<datamongo['o:version'])
						{
							log.debug('our resource is newer');	
							var datalaunch =	{};

							MongoServiceMerge.MongooseToDatacore(mondodbmodel,datamongo,datalaunch);
							
							datalaunch['@id'] = r['@id'];
							datalaunch['o:version']= r['o:version'];
							
							//log.debug('we launch :'+util.inspect(datalaunch)+"\n in  string: "+JSON.stringify(datalaunch));	
						
							done();
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
							//log.debug('our resource is uptodate');
							/*nothing to do*/
							done();
						}

					}

				}
				);
				})(r);

			},function(err){
			
				if(err)log.error(err);
				log.debug("All done !!");
			});
			
			//now all data we existe in datacore isuptodate now merge our data with the data core(note this is idiot and very hard...)
		// when we add data to mongo is automaticelle add to datacore...
		
			var idindatacore = [];
			for(var r of dataCoreResource)
			{
				idindatacore.push(r['@id']);
			}
			//log.debug(m+" WHAT DO DO : "+util.inspect(idindatacore));
			
				var mondodbmodel = mongoose.model(m);
				mondodbmodel.find({'@id':{ $nin:idindatacore }},
				function(err,datainmongo){
					
					if(err)
					{
						log.error("Cant compare datacore and mondodb :"+err);
						return;
					}
					if(datainmongo.length==0)//nothing todo
					return;
					
					
					var PostResource = [];
						for(var r of datainmongo)
						{
				
							var datalaunch = JSON.parse(JSON.stringify(r));
							var datacore = {};
							MongoServiceMerge.MongooseToDatacore(mondodbmodel,datalaunch,datacore);
						//	log.debug('We send :'+datacore['@id']+'on datacore');	
							
							datacore['@id'] = r['@id'];
							datacore['o:version']= -1;	
							PostResource.push(datacore);
						}


				//	log.debug('POST RESOURCE'+util.inspect(PostResource));
					parent.PostRequest(token,mondodbmodel.modelName,'','oasis.sandbox',JSON.stringify(PostResource),function(err,body){
				
						if(err)
						log.error(mondodbmodel.modelName+": err in post data datacore: "+err+" :"+util.inspect(body));
					
				
								});
					
					
				
			
					});

	
			},{'X-Datacore-View':' '});
		})(m);
			
	}
	
	});
}
	//This class must be inherit , it represnt a model in Datacore and in mongoose
	 function DatacoreResource() {

        this.ListAtribut = null;
        this.Version = 'o:version';
        this.ModelName = null;
        this.Model = null;
        this.Shem = {};
        this.Shem['@id'] = {
            type: String,
            unique: true,
            required: true
        };
        this.Shem[this.Version] = Number;
    }


//This funtion save the object in the data to the URI/ID, orther argument is array pass in the same ordrer thar ListAtribut
    DatacoreResource.prototype.save = function(callbackend,mod, ID) {
        var arguments_save = arguments;
       var self = this;

        if (mod) {
            var what = {};
            what['@id'] = 'http://data.ozwillo.com/dc/type/' + this.ModelName + "/" + parent.encodeUriPathComponent('' + ID);
           
            this.Model.findOne(what, _privsave);
        }
        else {
            mod = 0;
            var prei = {};
            _privsave(0, prei);
        }
        

        function _privsave(err, prei) {
            if (err || !prei) {
                if(err)
                callbackend(err);
                else
                callbackend("notfound");
                return;
            }

            if (!mod)
                prei['@id'] = 'http://data.ozwillo.com/dc/type/' + self.ModelName + "/" + parent.encodeUriPathComponent('' + ID);
            if (!mod)
                prei[self.Version] = 0;
            else
                prei[self.Version] = prei[self.Version] + 1;

            var arg = 3;
                   
            for (var i = 0; i < self.ListAtribut.length; i++,arg++) {
                if (arguments_save[arg]!= null && arguments_save[arg]!='undefined')
                prei[self.ListAtribut[i]] = arguments_save[arg];
            }
            log.debug("prei : " + util.inspect(prei));

			  
			  if(conf.onlylog)
			  {
				callbackend(0);
			  return;
			  }
            if (!mod) {
                var i = new self.Model(prei);
               i.save(function(err) {
                    if (err) {
                    	log.error("cant save:" + err);callbackend(err);return
                    	
                    }
                  
                      
			                    
			                 prei[self.Version] = -1;
			                parent.Fakelogin.getTokenKeepInMind(function(token) {
			                   MongoServiceMerge.PostDataCore(token, self.Model, prei);
			                });
                    callbackend(err);
                });


            }
            else {

                prei.save(function(err) {
                    if (err) log.error("cant save:" + err);
                    callbackend(err);
                });
                parent.Fakelogin.getTokenKeepInMind(function(token) {
			          MongoServiceMerge.PutDataCore(token, self.Model, prei);
			    });
            }
        }
    }
    
	 
	 //This function call the getData children function and send and save is return.
	 // arg is pass to getData
    DatacoreResource.prototype.WriteFlux = function(arg,callback)
    {
    	var self=this;
        callback = callback || function(){}; 
        if(this.GetData)
         this.GetData(arg, function(err) {
              if(err){log.error(err);callback(err);return;}
                var argsave = [callback,0];
                var i= 1;
                for(;i<arguments.length;i++)
                argsave.push(arguments[i]);
                    
              self.save.apply(self,argsave);
         });
        
    };
    
	DatacoreResource.prototype.GetResource =function(ID,callback)
	{
		callback=callback || function(){};
	    var what ={};
		what['@id'] = 'http://data.ozwillo.com/dc/type/' + this.ModelName + "/" + parent.encodeUriPathComponent('' + ID);

		this.Model.findOne(what, function (err, one) {
			if (err) {callback("eror with the recource :"+what['@id']);return};
			if(one)
			callback(0,one);
			else
			callback("notfound");
		})
	
	}
    
	
MongoServiceMerge.DatacoreResource = DatacoreResource;
