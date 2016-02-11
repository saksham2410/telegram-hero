# Telegram Hero

![Circle CI](https://circleci.com/gh/car-throttle/telegram-hero/tree/master.svg?style=shield)
![Coverage Status](https://coveralls.io/repos/car-throttle/telegram-hero/badge.svg?branch=master&service=github)

So, if you've ever used Telegram, you'll know how great it is to chat securely between people. And if you're a developer
and you've checked out Telegram Bots, you'll know [there is an API](telegram-bot-api) to allow you to programmatically
communicate with people.

... Well, nearly awesome.

Most modules written for Node are built around instances, similar to:

```js
var bot = new TelegramBot('my-awesome-token-here');

bot.sendMessage('Hello, world!', callback);
```

And, whilst this is fine for just one, or a couple of bots, it's not ideal for a service with many potential bots. And
these solutions aren't very flexible when it comes to [the webhooks feature](https://core.telegram.org/bots/api#setwebhook)
that Telegram bots provide.

So instead, we offer this simplified module with a focus on flexibility. You can use this with as many bots and as many
webhooks as you like.

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
  method: 'sendMessage',
  message: {
    text: 'This are not the droids that you are looking for, move along.'
  }
}, callback);
```

The `send` method allows you to interface directly with the Telegram Bot API, with some slight adjustments to make the
interaction so much easier.

You must always provide a `method`, which should be a method from the [Telegram Bot API][telegram-bot-api].

Above is an example of the `sendMessage` method. Below is an example of a couple of other methods:

```js
telegram.send({
  token: '<insert-your-bot-token>',
  to: '<insert-a-chat-id>',
  method: 'sendPhoto',
  message: {
    photo: fs.createReadStream(path.join(__dirname, 'droids.jpeg')),
    caption: 'This door is locked, move onto the next one'
  }
}, callback);

telegram.send({
  token: '<insert-your-bot-token>',
  to: '<insert-a-chat-id>',
  method: 'sendAudio',
  message: {
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
    message: {
      text: 'Which picture do you like more?'
    }
  },
  {
    method: 'sendPhoto',
    message: {
      photo: fs.createReadStream(path.join(__dirname, 'photo1.jpg')),
      caption: 'one'
    }
  },
  {
    method: 'sendPhoto',
    message: {
      photo: fs.createReadStream(path.join(__dirname, 'photo2.jpg')),
      caption: 'two'
    }
  }
];

async.map(MESSAGES, function (payload, nextMessage) {
  telegram.send({
    token: '<insert-your-bot-token>',
    to: '<insert-a-chat-id>',
    method: payload.method,
    message: payload.message
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
    method: 'sendMessage',
    message: {
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
    message: { text: 'Which picture do you like more?' }
  },
  {
    method: 'sendPhoto',
    message: {
      photo: fs.createReadStream(path.join(__dirname, 'photo1.jpg')),
      caption: 'one'
    }
  },
  {
    method: 'sendPhoto',
    message: {
      photo: fs.createReadStream(path.join(__dirname, 'photo2.jpg')),
      caption: 'two'
    }
  }
];

async.map(CHAT_IDS, function (chat_id, nextChatId) {
  async.map(MESSAGES, function (payload, nextMessage) {
    telegram.send({
      token: '<insert-your-bot-token>',
      to: chat_id,
      method: payload.method,
      message: payload.message
    }, nextMessage);
  }, nextChatId);
}, callback);
```

## Receive Usage (with Express)

```js
var bodyParser = require('body-parser');
var express = require('express');
var telegram = require('telegram-hero');

var app = express();

var telegramMiddleware = telegram.webhook({
  bots: {
    my_bot: {
      name: 'My Bot',
      token: '1234:ABCDEFGHIJKL',
      auth: '4b238abe064c9d6c860e386d8cbf8cd2'
    }
  }
});

/**
 * localhost:3000/webhook/my_bot/4b238abe064c9d6c860e386d8cbf8cd2
 */
app.post('/webhook/:bot_name/:auth', bodyParser.json(), telegramMiddleware, function (req, res, next) {
  // req.telegram.message is the message object.
  // req.telegram.bot is the bot object that we passed into the middleware.

  // An error with status code 403 is returned if authentication fails

  // Reply to the incoming message.
  // The bot token, chat id, and reply_to_message_id are preset.
  telegram.reply({
    context: req.telegram,
    method: 'sendMessage',
    message: {
      text: 'Thanks for the reply! Have a nice day'
    }
  });
});

app.listen(3000);
```

## One more thing..

- Questions? Awesome! [Open an issue](https://github.com/car-throttle/telegram-hero/issues) to get the :tada: started!

[telegram-bot-api]: https://core.telegram.org/bots/api
