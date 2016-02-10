# Telegram Hero

![Circle CI](https://circleci.com/gh/car-throttle/telegram-hero/tree/master.svg?style=shield)
![Coverage Status](https://coveralls.io/repos/car-throttle/telegram-hero/badge.svg?branch=master&service=github)

So, if you've ever used Telegram, you'll know how great it is to chat securely between people. And if you're a developer
and you've checked out Telegram Bots, you'll know [there is an API](telegram-bot-api) to allow you to programmatically
communicate with people. How awesome!!

... Well, nearly awesome.

Most modules written for Node are built around instances, similar to:

```js
var bot = new TelegramBot('my-awesome-token-here');

bot.sendMessage('Hello, world!', callback);

bot.sendPhoto(path.join(__dirname, 'attachment1.jpg'), callback);
```

And, whilst this is fine for a script, this isn't great for APIs. And these solutions aren't (easily) compatible with
[the webhooks feature](https://core.telegram.org/bots/api#setwebhook) that Telegram provide.

So instead, we offer this simplified module. You can use this with as many bots and as many webhooks as you like.
Go nuts!!

## Installation

```
npm install telegram-hero
```

## Send Usage

In it's simplest form:

```js
var telegram = require('telegram-hero');

telegram.send({
  token: '<insert-your-bot-token>',
  to: '<insert-a-chat-id>',
  message: {
    method: 'sendMessage',
    text: 'This are not the droids that you are looking for, move along.'
  }
}, callback);
```

The `send` method allows you to interface directly with the Telegram Bot API, with some slight adjustments to make the
interaction so much easier.

You must always provide a `method`, which should be a method from the [Telegram Bot API][telegram-bot-api].

Now, above is an example of the `sendMessage` method. Below is an example of a couple of other methods:

```js
telegram.send({
  token: '<insert-your-bot-token>',
  to: '<insert-a-chat-id>',
  message: {
    method: 'sendPhoto',
    photo: fs.createReadStream(path.join(__dirname, 'droids.jpeg')),
    caption: 'Optional caption for that photo'
  }
}, callback);

telegram.send({
  token: '<insert-your-bot-token>',
  to: '<insert-a-chat-id>',
  message: {
    method: 'sendAudio',
    audio: fs.createReadStream(path.join(__dirname, 'theme.mp3'))
  }
}, callback);
```

As you can see, you quite easily attach files (also known as an `InputFile` in the Bot API documentation) by reading
them in as streams or buffers :tada: You simply choose the `method` you want and include the other fields that you need.

### Multiple Messages

The [Telegram Bot API][telegram-bot-api] doesn't support multiple messages, so neither does this module. However, if
you want to send multiple messages to a client then you can quite easily do so with the assistance of such modules
like [`async`](//github.com/caolan/async):

```js
var async = require('async');

var MESSAGES = [
  {
    method: 'sendMessage',
    text: 'Which picture do you like more?'
  },
  {
    method: 'sendPhoto',
    photo: fs.createReadStream(path.join(__dirname, 'photo1.jpg')),
    caption: 'one'
  },
  {
    method: 'sendPhoto',
    photo: fs.createReadStream(path.join(__dirname, 'photo2.jpg')),
    caption: 'two'
  }
];

async.map(MESSAGES, function (message, nextMessage) {
  telegram.send({
    token: '<insert-your-bot-token>',
    to: '<insert-a-chat-id>',
    message: message
  }, nextMessage);
}, callback);
```

### Multiple Recipients

The [Telegram Bot API][telegram-bot-api] also doesn't support multiple recipients, and so neither does this module.
Again, if you want to send multiple messages to a client then you can quite easily do so with the assistance of such
modules like [`async`](//github.com/caolan/async):

```js
var async = require('async');

var CHAT_IDS = [
  '<first-chat-id>', '<second-chat-id>'
];

async.map(CHAT_IDS, function (chat_id, nextChatId) {
  telegram.send({
    token: '<insert-your-bot-token>',
    to: chat_id,
    message: {
      method: 'sendMessage',
      text: 'Good evening! Hope you had a pleasant day!'
    }
  }, nextChatId);
}, callback);
```

### Multiple Messages and Recipients

And to combine the above:

```js
var async = require('async');

var CHAT_IDS = [
  '<first-chat-id>', '<second-chat-id>'
];

var MESSAGES = [
  {
    method: 'sendMessage',
    text: 'Which picture do you like more?'
  },
  {
    method: 'sendPhoto',
    photo: fs.createReadStream(path.join(__dirname, 'photo1.jpg')),
    caption: 'one'
  },
  {
    method: 'sendPhoto',
    photo: fs.createReadStream(path.join(__dirname, 'photo2.jpg')),
    caption: 'two'
  }
];

async.map(CHAT_IDS, function (chat_id, nextChatId) {
  async.map(MESSAGES, function (message, nextMessage) {
    telegram.send({
      token: '<insert-your-bot-token>',
      to: chat_id,
      message: message
    }, nextMessage);
  }, nextChatId);
}, callback);
```

## Receive Usage

```js
var bodyParser = require('body-parser');
var express = require('express');
var telegram = require('telegram-hero');

var app = express();

/**
 * localhost:3000/?auth=4b238abe064c9d6c860e386d8cbf8cd2
 */
app.post('/', bodyParser.json(), telegram.api({
  auth: '4b238abe064c9d6c860e386d8cbf8cd2',
  // The above string is exactly the same as the below object
  // auth: {
  //   key: '4b238abe064c9d6c860e386d8cbf8cd2',
  //   query: 'auth'
  // }
  token: '123456:ABCDEFGHIJKLMNOPQ',
  incoming: function (message, done) {
    done(null, {
      method: 'sendMessage',
      text: 'So long, and thanks for all the fish!'
    });
  }
}));

/**
 * localhost:3000/incoming/4b238abe064c9d6c860e386d8cbf8cd2
 */
app.post('/incoming/:key', bodyParser.json(), telegram.api({
  auth: {
    key: '4b238abe064c9d6c860e386d8cbf8cd2',
    param: 'key'
  },
  token: '123456:ABCDEFGHIJKLMNOPQ',
  incoming: function (message, done) {
    done(null, {
      method: 'sendMessage',
      text: 'And the entry for the Earth read "Harmless".'
    });
  }
}));

/**
 * localhost:3000/incoming/megaman/3788fe92142a99ab9e72274f7664bcb9
 */
app.post('/incoming/:name/:key', bodyParser.json(), telegram.api({
  auth: function (req, res, next) {
    /**
     * This code is definitely not production-safe!
     */
    if (req.param.name !== 'megaman') {
      return next(new Error('You\'re not Megaman :('));
    }
    if (req.param.key !== '3788fe92142a99ab9e72274f7664bcb9') {
      return next(new Error('You are not Megaman :/'));
    }

    next();
  },
  token: '123456:ABCDEFGHIJKLMNOPQ',
  incoming: function (message, done) {
    done(null, {
      method: 'sendMessage',
      text: 'Oh no, not again!'
    });
  }
}));

app.listen(3000);
```

## One more thing..

- Questions? Awesome! [Open an issue](https://github.com/car-throttle/telegram-hero/issues) to get the :tada: started!

[telegram-bot-api]: https://core.telegram.org/bots/api
