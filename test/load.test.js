var assert = require('assert');
var hippie = require('hippie');

var host = process.env.FEEDBACKER_TEST_HOST || 'localhost:8126';

suite('API server', function() {
  this.timeout(15000);

  suite('#LOGIN', function() {
    test('should return 200 for user/password secret pass', function(done) {
      hippie()
        .header("User-Agent", "hippie")
        .get('http://'+host+'/?user=secret&pass=pass')
        .expectStatus(200)
        .end(function(err, res, body) {
            if (err) throw err;
            done();
        });
    });

    test('should return 401 for user/password secret pass', function(done) {
      hippie()
        .header("User-Agent", "hippie")
        .get('http://'+host+'/?user=INCORRECT&pass=INCORRECT')
        .expectStatus(401)
        .end(function(err, res, body) {
            if (err) throw err;
            done();
        });
    });
  });

  suite.only('#POST RESPONSE', function() {
    setup(function(done) {
      console.log('====================0001')
      hippie()
        .header("User-Agent", "hippie")
        .get('http://'+host+'/?user=secret&pass=pass')
        .expectStatus(200)
        .end(function(err, res, body) {
            if (err) throw err;
            done();
        });
    });
    test('POST /response should return 200-ok', function(done) {
      console.log('====================0002')
      var total = 1;
      var pending = total;
      for(var i = 0; i < total; i++) {
        hippie()
          .post('http://'+host+'/response')
          .send('{"question": 0, "response": 2}')
          .expectStatus(200)
          .end(function(err, res, body) {
              if (err) throw err;
              pending -= 1;
              if (pending <= 0) done();
          });

      }
    });
  });
});
