var assert = require('assert');
var hippie = require('hippie');

var host = process.env.FEEDBACKER_TEST_HOST || 'localhost:8126';

suite('API server', function() {
  this.timeout(30000);

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

  suite('#POST RESPONSE', function() {
    setup(function(done) {
      hippie()
        .header("User-Agent", "hippie")
        .get('http://'+host+'/?user=secret&pass=pass')
        .expectStatus(200)
        .end(function(err, res, body) {
            if (err) throw err;
            done();
        });
    });
    test('500 x (POST /response) - should return 200-ok', function(done) {
      var total = 500;
      var pending = total;
      for(var i = 0; i < total; i++) {
        console.log(">>About to send. still pending: ",pending);
        hippie()
          .post('http://'+host+'/response')
          .send('{"question": 0, "response": 2}')
          .expectStatus(200)
          .end(function(err, res, body) {
              if (err) throw err;
              pending -= 1;
              console.log("<<Received response. still pending: ",pending);
              if (pending <= 0) done();
          });
      }
    });

    suite('SUBSCRIBE', function () {
      setup(function(done) {
        hippie()
          .header("User-Agent", "hippie")
          .get('http://'+host+'/?user=secret&pass=pass')
          .expectStatus(200)
          .end(function(err, res, body) {
              if (err) throw err;
              done();
          });
      });

      test('should receive responses via SSE', function (done) {
        var total = 500;

        var pending_responses = total;
        var pending_notifications = total + 1; // notifications responses + 1 on subscribe

        var EventSource = require('eventsource');

        var es = new EventSource('http://'+host+'/poll?tout=10000');
        es.onmessage = function(e) {
          pending_notifications -=1
          console.log(">>>>>>>>>>>>>>>>=======>>>> event received. pending: ", pending_notifications);
          if (pending_notifications === 0) done();
        };
        es.onerror = function() {
          console.log('ERROR!');
        };
        setTimeout(function(){
          for(var i = 0; i < total; i++) {
            console.log(">>About to send. still pending: ", pending_responses);
            hippie()
              .post('http://'+host+'/response')
              .send('{"question": 0, "response": 2}')
              .expectStatus(200)
              .end(function(err, res, body) {
                  if (err) throw err;
                  pending_responses -= 1;
                  console.log("<<Received response. still pending: ", pending_responses);
              });
          }

        }, 500);
      });
    });
  });
});
