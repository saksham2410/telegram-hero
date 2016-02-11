var request = require('request');
var telegram = module.exports = {};

var DEFAULTS = {
  token: null
};

telegram.configure = function (opts) {
  if (!opts) throw new Error('Invalid options passed to telegram.configure :(');
  if (opts.hasOwnProperty('token')) DEFAULTS.token = opts.token;
};

var extendOmit = function (omit_props) {
  var base_obj = {};

  for (var i = 1; i < arguments.length; i++) if (arguments[i]) {
    for (var prop in arguments[i]) if (arguments[i].hasOwnProperty(prop) && omit_props.indexOf(prop) < 0) {
      base_obj[prop] = arguments[i][prop];
    }
  }

  return base_obj;
};

telegram.send = function (opts, callback) {
  if (DEFAULTS.token && !opts.token) opts.token = DEFAULTS.token;

  if (!opts.token) return callback(new Error('Missing `token` property'));
  if (!opts.to) return callback(new Error('Missing `to` property'));

  if (!opts.message) return callback(new Error('Missing `message` property'));
  if (typeof opts.message !== 'object') return callback(new Error('Incorrect type for `message` property'));
  if (!opts.message.method) return callback(new Error('Missing `method` property in `message` object'));
  if (typeof opts.message.method !== 'string') return callback(new Error(
    'Incorrect type for `message` property in `message` object'
  ));

  request({
    method: 'POST',
    url: 'https://api.telegram.org/bot' + opts.token + '/' + opts.message.method,
    headers: {
      'Accept': 'application/json'
    },
    json: true,
    formData: extendOmit([ 'method' ], opts.message, {
      chat_id: opts.to
    })
  }, function (err, res, body) {
    if (!err && body && body.ok && body.result) callback(null, body.result);
    else if (body && !body.ok && body.description) callback(new Error(body.description.replace('[Error]:', '').trim()));
    else if (err) callback(err);
    else callback(new Error('Something went wrong'));
  });
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
