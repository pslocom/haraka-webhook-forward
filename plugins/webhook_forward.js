var logger  = require('./logger');
var utils   = require('./utils');
var request = require('request');
var fs      = require('fs');

//Currently supported methods for submitting mail data to a webhook
var supported_methods = ['POST', 'PUT'];

//Empty object to put the configuration options in
var options = { };

function readConfig(plugin) {
    var config = plugin.config.get('webhook_forward.ini');

    if(!config.webhook) {
        return false;
    } else {
        options.url                 = config.webhook.url;
        options.method              = config.webhook.method.toUpperCase() || 'POST';
        options.allow_self_signed   = config.webhook.allow_self_signed || 0;

        options.store_failed_requests = config.webhook.store_failed_requests || 0;

        if(!utils.in_array(options.method, supported_methods)) {
            logger.logerror('Attempting to use an unsupported method.  Try one of these: '+supported_methods.join(', '));
            return false;
        }
    }

    return true;
}

exports.hook_data = function (next, connection) {
    // enable mail body parsing
    connection.transaction.parse_body = 1;
    next();
};

exports.hook_queue = function(next, connection) {
    //Parse the config on every run just in case there were changes
    if(!readConfig(this)) {
        next(CONT);
    }

    function onWebhookResponse(response) {
        if(response.statusCode === 200) {
            logger.loginfo("URL responded with 200 OK!");
        } else {
            onWebhookError("URL responded with a "+response.statusCode);
        }
    }

    function onWebhookError(err) {
        logger.logerror("Error processing webhook: "+err);

        if(options.store_failed_requests !== 0) {
            fs.stat(options.store_failed_requests, function(err, stats) {
                if(typeof stats !== 'undefined' && stats.isDirectory()) {
                    //Add the method to the data we are storing
                    request_options.method = options.method;

                    var request_filepath = options.store_failed_requests+'/'+'webhook_failed.'+Date.now()+'.json';

                    fs.open(request_filepath, 'w', function(err, fd) {
                        if(!err) {
                            logger.loginfo("Saving failed webhook request data to "+request_filepath);
                            fs.write(fd, JSON.stringify(request_options));
                        } else {
                            logger.logerror("Cannot store failed request, could not open "+request_filepath+" for writing");
                        }
                    });
                } else {
                    logger.logerror("Cannot store failed request, "+options.store_failed_requests+" is not a valid directory");
                }
            });
        }
    }

    var request_options = {
        "url":  options.url,
        "body": {
            "headers":  connection.transaction.header.headers_decoded,
            "body":     connection.transaction.body.bodytext
        },
        "json": true
    };

    if(options.allow_self_signed === 1) {
        //Only use this during debugging.  Allows you to use self signed (or invalid) certificates
        logger.logwarn("Potential Security Issue!  Only use allow_self_signed while debugging!");
        request_options.rejectUnauthorized = false;
    }

    try {
        logger.logdebug("Attempting to "+options.method+" to "+options.url);
        if(options.method === 'POST') {
            request.post(request_options)
                .on('response', onWebhookResponse)
                .on('error', onWebhookError);
        } else if(options.method === 'PUT') {
            request.put(request_options)
                .on('response', onWebhookResponse)
                .on('error', onWebhookError);
        } else {
            logger.logerror('Invalid HTTP method! Try one of these: '+supported_methods.join(', '));
        }
    } catch(e) {
        logger.logerror('Could not connect to webhook ('+e+')');
    }

    next();
};
