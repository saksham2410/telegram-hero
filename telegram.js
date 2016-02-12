var async = require('async');
var request = require('request');
var telegram = module.exports = {};

var DEFAULTS = {
  token: null
};

telegram.configure = function (opts) {
  if (!opts) throw new Error('Invalid options passed to telegram.configure :(');
  if (opts.hasOwnProperty('token')) DEFAULTS.token = opts.token;
};

var extend = function (base_obj) {
  for (var i = 1; i < arguments.length; i++) if (arguments[i]) {
    for (var prop in arguments[i]) if (arguments[i].hasOwnProperty(prop)) base_obj[prop] = arguments[i][prop];
  }

  return base_obj;
};

telegram.send = function (opts, callback) {
  if (DEFAULTS.token && !opts.token) opts.token = DEFAULTS.token;

  if (!opts.token) return callback(new Error('Missing `token` property'));
  if (!opts.to) return callback(new Error('Missing `to` property'));

  if (!opts.method) return callback(new Error('Missing `method` property'));
  if (typeof opts.method !== 'string') return callback(new Error('Incorrect type for `method` property'));
  if (!opts.message) return callback(new Error('Missing `message` property'));
  if (typeof opts.message !== 'object') return callback(new Error('Incorrect type for `message` property'));

  request({
    method: 'POST',
    url: 'https://api.telegram.org/bot' + opts.token + '/' + opts.method,
    headers: {
      'Accept': 'application/json'
    },
    json: true,
    formData: extend(opts.message, {
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
  opts = opts || {};
  if (typeof opts !== 'object') throw new Error('Invalid object of options');

  opts.bot_name_param = opts.bot_name_param || 'bot_name';
  opts.bot_auth_param = opts.bot_auth_param || 'bot_auth';

  if (opts.bots && typeof opts.bots === 'object') {
    for (var slug in opts.bots) if (opts.bots.hasOwnProperty(slug)) {
      if (typeof opts.bots[slug] === 'string') opts.bots[slug] = { token: opts.bots[slug] };
      if (!opts.bots[slug].token) throw new Error('Missing token for "' + slug + '" bot');

      opts.bots[slug].name = opts.bots[slug].name || slug;
      opts.bots[slug].slug = slug;

      if (opts.bots[slug].auth && typeof opts.bots[slug].auth !== 'string') {
        throw new Error('`auth` property for "' + slug + '" should be a string');
      }
    }
  }
  else if (opts.bots) throw new Error('Bots option should be an object of bots or omitted');

  return function telegramWebhook(req, res, next) {
    var bot = null;
    var err = null;

    if (!req.params || !req.params[opts.bot_name_param]) {
      err = new Error('Missing bot name in URL');
      err.status = err.statusCode = 404;
      return next(err);
    }

    if (!req.body) {
      err = new Error('Missing body - did you parse the JSON body?');
      err.status = err.statusCode = 500;
      return next(err);
    }

    if (
      !req.body || !req.body.update_id || !req.body.message ||
      !req.body.message.message_id || !req.body.message.from || !req.body.message.from.id
    ) {
      err = new Error('Invalid message received from Telegram');
      err.status = err.statusCode = 400;
      return next(err);
    }

    if (req.telegram && req.telegram.bot) bot = req.telegram.bot;
    else if (opts.bots) bot = opts.bots[req.params[opts.bot_name_param]];
    if (!bot) {
      err = new Error('Unknown bot "' + req.params[opts.bot_name_param] + '"');
      err.status = err.statusCode = 404;
      return next(err);
    }

    if (bot && bot.auth) {
      if (!req.params[opts.bot_auth_param]) {
        err = new Error('Missing bot auth in URL');
        err.status = err.statusCode = 401;
        return next(err);
      }

      if (bot.auth === req.params[opts.bot_auth_param]) {
        err = new Error('Incorrect authenication token for "' + bot.slug + '" bot');
        err.status = err.statusCode = 403;
        return next(err);
      }
    }

    req.telegram = {
      bot: bot,
      message: req.body.message,
      token: opts.token,
      update_id: req.body.update_id
    };

    req.telegram.reply = function (method, message, callback) {
      message.reply_to_message_id = req.body.message.message_id;

      telegram.send({
        token: req.telegram.bot.token,
        to: req.body.message.from.id,
        method: method,
        message: message
      }, callback);
    };

    next();
  };
};
