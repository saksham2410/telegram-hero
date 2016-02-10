var async = require('async');
var extend = require('extend');
var request = require('request');
var telegram = module.exports = {};

var DEFAULTS = {
  token: null
};

telegram.configure = function (opts) {
  if (!opts) throw new Error('Invalid options passed to telegram.configure :(');
  if (opts.hasOwnProperty('token')) DEFAULTS.token = opts.token;
};

telegram.send = function (opts, callback) {
  if (DEFAULTS.token && !opts.token) opts.token = DEFAULTS.token;

  opts = extend({}, opts);
  if (!opts.token) return callback(new Error('Missing `token` property'));
  if (!opts.to) return callback(new Error('Missing `to` property'));
  if (opts.multi && !Array.isArray(opts.multi)) return callback(new Error('`multi` property should be an array'));

  var chat_ids = Array.isArray(opts.to) ? opts.to : [ opts.to ];
  var messages = [];

  if (!opts.multi) messages = [ {
    method: opts.method,
    data: opts.data
  } ];

  var err_suffix = ' for' + (messages.length > 1 ? ' multi' : '') + ' message';
  for (var i = 0; i < messages.length; i++) {
    if (!messages[i].method) return callback(new Error('Missing `method`' + err_suffix));
    if (!messages[i].data) return callback(new Error('Missing `data`' + err_suffix));
  }

  async.map(chat_ids, function (chat_id, mapCb) {
    async.map(messages, function (message, multiCb) {
      request({
        method: 'POST',
        url: 'https://api.telegram.org/bot' + opts.token + '/' + message.method,
        headers: {
          'Accept': 'application/json'
        },
        json: true,
        formData: extend({}, message.data, {
          chat_id: chat_id
        })
      }, function (err, res, body) {
        if (!err && body && body.ok && body.result) multiCb(null, body.result);
        else if (body && body.description) {
          body.description = body.description.replace('[Error]:', '').trim();
          multiCb(null, { error: body.description });
        }
        else if (err && err.message) multiCb(null, { error: err.message });
        else multiCb(null, { error: 'Something went wrong' });
      });
    }, mapCb);
  }, callback);
};

telegram.api = function (opts) {
  if (DEFAULTS.token && !opts.token) opts.token = DEFAULTS.token;

  if (!opts.token) throw new Error('Missing token');
  if (typeof opts.incoming !== 'function') {
    console.error('Missing incoming function - using a default logger instead');
    opts.incoming = function (message) {
      console.log('Message', JSON.stringify(message, null, 2));
    };
  }

  if (opts.url) {
    var setWebhookData = {};

    if (typeof opts.url === 'string') setWebhookData.url = opts.url;
    else if (opts.url && opts.url.url) {
      setWebhookData.url = opts.url.url;
      if (opts.url.certificate) setWebhookData.certificate = opts.url.certificate;
    }

    if (typeof opts.auth === 'string') setWebhookData.url = '?auth=' + opts.auth;

    telegram.send({
      token: opts.token,
      method: 'setWebhook',
      data: setWebhookData
    }, function (err, body) {
      if (err || (body && !body.ok && body.description)) {
        console.error('There was an error setting the webhook automatically');
        console.error(err || body.description);
      }
    });
  }

  var fns = [];

  if (opts.auth) {
    if (typeof opts.auth === 'string') opts.auth = {
      key: opts.auth,
      query: 'auth'
    };

    if (typeof opts.auth === 'function') fns.push(opts.auth);
    else if (typeof opts.auth !== 'object') throw new Error('`auth` property should be a string, function or object');
    else {
      if (opts.auth.query && opts.auth.param) throw new Error('Auth object cannot have a query and param property');
      if (!opts.auth.key) throw new Error('Missing auth key');

      var props = opts.auth.hasOwnProperty('query') ? 'query' : 'param';
      var prop = opts.auth.hasOwnProperty('query') ? opts.auth.query : opts.auth.param;

      fns.push(function (req, res, next) {
        if (!req[props] || !req[props][prop]) next(new Error('Missing ' + props + '"' + prop + '"'));
        else if (req[props][prop] !== opts.auth.key) next(new Error('Invalid authentication ' + props));
        else next();
      });
    }
  }

  fns.push(function telegramWebhook(req, res, next) {
    if (!req.body) return next(new Error('Missing body - did you parse the JSON body?'));

    var finished = function (err, reply) {
      if (err) next(err);
      else if (reply) res.status(200).set('Content-Type', 'application/json').json(reply);
      else res.status(204).send();
    };

    if (opts.incoming.length === 2) opts.incoming(req.body.message, finished);
    else if (opts.incoming.length === 1) {
      var err = null;
      var reply = null;

      try {
        reply = opts.incoming(req.body.message);
      }
      catch (e) {
        err = e;
      }

      finished(err, reply);
    }
    else finished();
  });

  return fns;
};
