
# OZWILLO-NODE-CLIENT

- http://www.ozwillo.com/ 
-  https://github.com/ozwillo/ozwillo-node-client

Copyright (c) 2015 Open Wide - http://www.openwide.fr

### Description 

OzwilloUtil (Ozwillo node client) is a set of tool to use ozwillo.
Today this application contains three main app modules : 

- FakeLogin to get a token with your account.
- Connection : tool for getting a token from a user
- MongoServiceMerge : tool which help to merge data stored in mondodb with the datacore

NB. All modules are experimental and not well documented. Take a look to *docs* directory !!!

### Requirements

It has been develop with node 0.12.7 (``nvm install 0.12.7``).


To run this *node app* you needs the next *node_modules* (see dependencies in *package.json* file) :
- util
- cache-manager
- extend
- log4js
- request
- simple-oauth2
- mongoose
- locks

To import / install them, you can use *npm* : ``npm install``

### Use

**Sample_token** is a script to have token. To run it you can use :

``node Sample_token.js ./confile.json``

  *Dont forget the*  **./**  *if the configuration file to be used is located in the current directory !!!*

