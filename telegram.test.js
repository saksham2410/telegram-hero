var rewire = require('rewire');

describe('telegram', function () {
  var telegram = rewire('./telegram');

  describe('#configure', function () {
    var DEFAULTS = {};

    before(function () {
      DEFAULTS = telegram.__get__('DEFAULTS');
    });

    afterEach(function () {
      telegram.__set__('DEFAULTS', DEFAULTS);
    });

    it('should do nothing if no valid keys are passed', function () {
      telegram.configure({});
      telegram.__get__('DEFAULTS').should.be.an.Object.and.eql({
        token: null
      });
    });

    it('should set a token if provided', function () {
      var TOKEN = '123456:hehePRETENDauthenticationTOKEN';
      telegram.configure({
        token: TOKEN
      });
      telegram.__get__('DEFAULTS').should.be.an.Object.and.eql({
        token: TOKEN
      });
    });

  });

  describe('#send', function () {

    it('should send a message correctly');

  });

  describe('#api', function () {

    it('should throw an error if you forget the token');

    it('should return the middlewares correctly');

  });
});
