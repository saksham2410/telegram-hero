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
  if (typeof opts !== 'object') throw new Error('Invalid object of options');
  if (typeof opts.bots !== 'object') throw new TypeError('Expected an object of bots');

  opts.bot_name_param = opts.bot_name_param || 'bot_name';
  opts.bot_auth_param = opts.bot_auth_param || 'bot_auth';

  for (var slug in opts.bots) if (opts.bots.hasOwnProperty(slug)) {
    if (typeof opts.bots[slug] === 'string') opts.bots[slug] = { token: opts.bots[slug] };
    if (!opts.bots[slug].token) throw new Error('Missing token for "' + slug + '" bot');

    opts.bots[slug].name = opts.bots[slug].name || slug;
    opts.bots[slug].slug = slug;

    if (opts.bots[slug].auth && typeof opts.bots[slug].auth !== 'string') {
      throw new Error('`auth` property for "' + slug + '" should be a string');
    }
  }

  return function telegramWebhook(req, res, next) {
    var err = null;

    if (!req.param || !req.param[opts.bot_name_param]) {
      err = new Error('Missing bot name in URL');
      err.status = err.statusCode = 404;
      return next(err);
    }
    if (!req.body) {
      err = new Error('Missing body - did you parse the JSON body?');
      err.status = err.statusCode = 500;
      return next(err);
    }

    var bot = opts.bots[req.param[opts.bot_name_param]];
    if (!bot) {
      err = new Error('Unknown bot "' + req.param[opts.bot_name_param] + '"');
      err.status = err.statusCode = 404;
      return next(err);
    }

    if (bot.auth) {
      if (!req.param[opts.bot_auth_param]) {
        err = new Error('Missing bot auth in URL');
        err.status = err.statusCode = 401;
        return next(err);
      }

      if (bot.auth === req.param[opts.bot_auth_param]) {
        err = new Error('Incorrect authenication token for "' + bot.slug + '" bot');
        err.status = err.statusCode = 403;
        return next(err);
      }
    }

    if (
      !req.body.message || !req.body.message.update_id || !req.body.message.message ||
      !req.body.message.message.message_id || !req.body.message.message.from || !req.body.message.message.from.id
    ) {
      err = new Error('Invalid message received from Telegram');
      err.status = err.statusCode = 400;
      return next(err);
    }

    req.telegram = {
      bot: bot,
      message: req.body.message.message,
      reply: function (message, callback) {
        message.reply_to_message_id = req.body.message.message.message_id;

        telegram.send({
          token: bot.token,
          to: req.body.message.message.from.id,
          message: message
        }, callback);
      },
      token: opts.token,
      update_id: req.body.message.update_id
    };

    next();
  };
};
