
# OZWILLO-NODE-CLIENT

### Description 

OzwilloUtil (Ozwillo node client) is a set of tools to use Ozwillo.
Today this application contains three main app modules : 

- FakeLogin : tool to get a token with your account.
- Connection : tool to get a token from an user
- MongoServiceMerge : tool which helps to merge data stored in mondodb with the datacore

NB. All modules are experimental and not well documented. Take a look to *docs* directory !!!

### Requirements

It has been developed with node 6.2.2 (``nvm install 6.2.2``).

To run this *node app* you need the next *node_modules* (see dependencies in *package.json* file) :
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

**Sample_token** is a script to get a token. To run it :

``node Sample_token.js ./confile.json``

*Dont forget the*  **./**  *if the configuration file to be used is located in the current directory !*

Copyright (c) 2015 Open Wide - http://www.openwide.fr
