'use strict';

//contgib
var winston = require('winston');
var request = require('request');

//mine
var config = require('../config/config');
var logger = new winston.Logger(config.logger.winston);
var db = require('../models');
var profile = require('./profile');

var profiles = {};
/*
[
 '1': { public:
     { fullname: 'Soichi Hayashi (@iu.edu)',
       bio: 'Working at Indiana University as a Software Engineer',
       email: 'hayashis@iu.edu' },
    private: null,
    sub: '1' },
  '2': { public:
     { fullname: 'Soichi Hayashi (gmail)',
       email: 'soichih@gmail.com',
       bio: 'Test account' },
    private: null,
    sub: '2' } 
}
*/

function cache(cb) {
    logger.debug("caching user public profiles");
    request({
        url: config.pub.profile_api+"/users",
        json: true,
        headers: { 'Authorization': 'Bearer '+config.pub.profile_jwt }
    }, function (err, res, body) {
        if(err) return cb(err);
        if (res.statusCode != 200) {
            return cb({message: "couldn't load user profiles from profile service:"+res.body, code: res.statusCode});
        }
        //update cache (let's assume user never disappears)
        body.forEach(function(user) {
            profiles[user.sub] = user.public;
        });
        //console.dir(profiles);
        cb(null);
    });
}

//synchronous.. because it uses the cache
exports.load_admins = function(subs) {
    var admins = [];
    subs.forEach(function(sub) {
        if(profiles[sub] === undefined) {
            logger.warn("couldn't find user with sub:"+sub+" in profiles cache");
        } else {
            admins.push(profiles[sub]);
        } 
    });
    return admins;
}

//start caching profile
exports.start = function(cb) {
    cache(cb);
    setInterval(function() {
        cache(function(err) {
            if(err) logger.error(err); //continue..
        });
    }, 1000*300); //every 5 minutes enough?
}

