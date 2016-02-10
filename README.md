# Telegram Hero

![Circle CI](https://circleci.com/gh/car-throttle/telegram-hero/tree/master.svg?style=shield)
![Coverage Status](https://coveralls.io/repos/car-throttle/telegram-hero/badge.svg?branch=master&service=github)

We want to communicate with humans through a bot. Because communicating with humans normally is just too complex.

```js
var telegram = require('telegram-hero');

telegram.send({
  token: '123456:ABCDEFGHIJKLMNOPQ',
  to: '0110100001101000',
  method: 'sendMessage',
  data: {
    text: 'Come with me if you want to live'
  }
});

telegram.send({
  token: '123456:ABCDEFGHIJKLMNOPQ',
  to: '0110100001101000',
  method: 'sendPhoto',
  data: {
    photo: fs.createReadStream(path.join(__dirname, '/attachment1.jpg')),
    caption: 'LOL'
  }
});

telegram.send({
  token: '123456:ABCDEFGHIJKLMNOPQ',
  to: '0110100001101000',
  multi: [
    {
      method: 'sendMessage',
      data: {
        text: 'Come with me if you want to live'
      }
    },
    {
      method: 'sendPhoto',
      data: {
        photo: fs.createReadStream(path.join(__dirname, '/attachment1.jpg')),
        caption: 'LOL'
      }
    }
  ]
});
```

```js
var bodyParser = require('body-parser');
var express = require('express');
var telegram = require('telegram-hero');

var app = express();

/**
 * localhost:3000/?auth=4b238abe064c9d6c860e386d8cbf8cd2
 */
app.use('/', bodyParser.json(), telegram.api({
  auth: '4b238abe064c9d6c860e386d8cbf8cd2',
  // The above string is exactly the same as the below object
  // auth: {
  //   key: '4b238abe064c9d6c860e386d8cbf8cd2',
  //   query: 'auth'
  // }
  token: '123456:ABCDEFGHIJKLMNOPQ',
  incoming: function (message, done) {
    done(null, 'So long, and thanks for all the fish!');
  }
}));

/**
 * localhost:3000/incoming/4b238abe064c9d6c860e386d8cbf8cd2
 */
app.use('/incoming/:key', bodyParser.json(), telegram.api({
  auth: {
    key: '4b238abe064c9d6c860e386d8cbf8cd2',
    param: 'key'
  },
  token: '123456:ABCDEFGHIJKLMNOPQ',
  incoming: function (message, done) {
    done({
      method: 'sendMessage',
      text: 'Thanks for that'
    });
  }
}));

/**
 * localhost:3000/incoming/megaman/3788fe92142a99ab9e72274f7664bcb9
 */
app.use('/incoming/:name/:key', bodyParser.json(), telegram.api({
  auth: function (req, res, next) {
    // This code is definitely not production-safe!
    if (req.param.name !== 'megaman') return next(new Error('You\'re not Megaman :('));
    if (req.param.key !== '3788fe92142a99ab9e72274f7664bcb9') return next(new Error('You are not Megaman :/'));

    next();
  },
  token: '123456:ABCDEFGHIJKLMNOPQ',
  incoming: function (message, done) {
    // Add the message to a queue for processing later
    done();
  }
}));

app.listen(3000);
```

## One more thing..

- Questions? Awesome! [Open an issue](https://github.com/car-throttle/telegram-hero/issues) to get the :tada: started!
