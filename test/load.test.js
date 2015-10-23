var assert = require('assert');
var hippie = require('hippie');
var EventSource = require('eventsource');

var host = process.env.POLLINGDECK_TEST_HOST || 'localhost:8126';
var verbose = process.env.POLLINGDECK_TEST_VERBOSE === 'true' || false;

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

    test('Eventually, the responses received via SSE are correct (votes to response 2 === 500)', function (done) {
      var total = 500;
      var received_updates = 0;

      var pending_responses = total;

      var es = new EventSource('http://'+host+'/poll?tout=10000');
      es.onmessage = function(e) { // count SSE notifications received, done on finished.
        if (verbose ) console.log("====>>>> event received. pending: ", pending_notifications);
        var responses_to_question_2_count = JSON.parse(e.data).responses[2].count;
        received_updates += 1;
        if (verbose ) console.log('RECEIVED UPDATES:::::: ', received_updates);
        if(responses_to_question_2_count === 500){
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
