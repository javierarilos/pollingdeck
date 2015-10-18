var assert = require('assert');
var hippie = require('hippie');

var host = process.env.FEEDBACKER_TEST_HOST || 'localhost:8126';
var verbose = process.env.FEEDBACKER_TEST_VERBOSE === 'true' || false;

suite('API server', function() {
  this.timeout(30000);

  function doLogin(done) {
    hippie()
      .header("User-Agent", "hippie")
      .get('http://'+host+'/?user=secret&pass=pass')
      .expectStatus(200)
      .end(function(err, res, body) {
          if (err) throw err;
          done();
      });
  }

  suite('#LOGIN', function() {
    test('should return 200 for user/password secret pass', function(done) {
      doLogin(done);
    });

    test('should return 401 for INCORRECT user/password', function(done) {
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
      doLogin(done);
    });
    test('500 x (POST /response) - should return 200-ok', function(done) {
      var total = 500;
      var pending = total;
      for(var i = 0; i < total; i++) {
        if (verbose ) console.log(">>About to send. still pending: ",pending);
        hippie()
          .post('http://'+host+'/response')
          .send('{"question": 0, "response": 2}')
          .expectStatus(200)
          .end(function(err, res, body) {
              if (err) throw err;
              pending -= 1;
              if (verbose ) console.log("<<Received response. still pending: ",pending);
              if (pending <= 0) done();
          });
      }
    });
  });

  suite('SUBSCRIBE', function () {
    setup(function(done) {
      doLogin(done);
    });

    test('single client should receive 500 response notifications via SSE', function (done) {
      var total = 500;

      var pending_responses = total;
      var pending_notifications = total + 1; // notifications responses + 1 on subscribe

      var EventSource = require('eventsource');

      var es = new EventSource('http://'+host+'/poll?tout=10000');
      es.onmessage = function(e) { // count SSE notifications received, done on finished.
        pending_notifications -=1
        if (verbose ) console.log("====>>>> event received. pending: ", pending_notifications);
        if (pending_notifications === 0) {
          var responses_to_question_2_count = JSON.parse(e.data).responses[2].count;
          assert.equal(responses_to_question_2_count, 500);
          done();
        }
      };
      es.onerror = function(e) {
        console.log('ERROR! on Event source', e);
      };
      setTimeout(function(){ //give a small time to EventSource to connect and POST responses
        for(var i = 0; i < total; i++) {
          if (verbose ) console.log(">>About to send. still pending: ", pending_responses);
          hippie()
            .post('http://'+host+'/response')
            .send('{"question": 0, "response": 2}')
            .expectStatus(200)
            .end(function(err, res, body) {
                if (err) throw err;
                pending_responses -= 1;
                if (verbose ) console.log("<<Received response. still pending: ", pending_responses);
            });
        }

      }, 500);
    });
  });

});
