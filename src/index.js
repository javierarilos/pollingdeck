#!/usr/bin/env node

var pollsProvider = require('./lib/pollsProvider');
var router = require('./lib/router').getInstance();
var sessionManager = require('./lib/sessionManager');
var auth = require('./lib/auth');

var http = require('http');
var fs = require('fs');
var path = require('path');

var FEEDBACKER_SESS='fdbckr-sess';
var UPDATE_DELAY=500; //min time between client updates.
http.globalAgent.maxSockets = 9999;

var cachedPageHtml=null;
var cachedPresenterSectionHtml=null;
var productionMode = false;

var currentPollId = 0;
var currentUser;
var currentPoll;
var currentQuestion = 0;
var clientResponses = [];
var userId = 0;
var usersCount = 0;
var lastUpdateClientsTs = 0;
var scheduledClientUpdate = null;

function getCurrentQuestion() {
    if (!currentPoll || !currentPoll.questions || !currentPoll.questions[currentQuestion]) {
        return null;
    }
    var currentQuestionObj = currentPoll.questions[currentQuestion];
    currentQuestionObj.usersCount = usersCount;
    return currentQuestionObj;
}

function updateClients(responses, object) {
    function doNotify() {
      lastUpdateClientsTs = Date.now();
      scheduledClientUpdate = null;
      console.log('===> NOW NOTIFYING');
      responses.forEach(function (response) {
        response.write('data: '+JSON.stringify(object)+'\n\n');
      });
    }

    var shouldUpdateImmediately = (Date.now() - lastUpdateClientsTs) >= UPDATE_DELAY;

    if (!scheduledClientUpdate && shouldUpdateImmediately) {
      console.log('===> IMMEDIATE NOTIFICATION');
      doNotify();
    } else if (!scheduledClientUpdate && !shouldUpdateImmediately) {
      console.log('===> SCHEDULING NOTIFICATION');
      scheduledClientUpdate = setTimeout(doNotify, UPDATE_DELAY);
    }
}

function login(req, res) {
  if (auth.isAuthorized(req)) {
      currentUser = req.parsedUrl.query.user;
      currentPoll = pollsProvider.initPoll(currentUser, currentPollId);
      var sessionId = sessionManager.newPresenterSession(currentUser);
      res.writeHead(200, {'Content-Type': 'text/html', 'Set-Cookie': FEEDBACKER_SESS+'='+sessionId});
      return res.end('');
  } else {
      res.writeHead(401, {'Content-Type': 'text/html'});
      return res.end('Unauthorized');
  }

}

function getIndex(req, res) {
    console.log('%%%%%%%%%%%%%%%% cookies:', req.cookies);
    var sessionId = req.cookies[FEEDBACKER_SESS];
    if (sessionManager.existsSession(sessionId)) {
        var page = productionMode ? cachedPageHtml : fs.readFileSync(path.join(__dirname, 'page.html'), {encoding: 'utf8'});
        page = page.replace('<!-- session-id -->', sessionId);
        //TODO: render an html piece in a page.
        var presenterHtml = productionMode ? cachedPresenterSectionHtml : fs.readFileSync(path.join(__dirname, 'presenterSection.html'), {encoding: 'utf8'}) + "<br/><br/><br/>>> production mode is OFF <<";
        page = page.replace('<!-- presenter-sect -->', presenterHtml);

        res.writeHead(200, {'Content-Type': 'text/html', 'Set-Cookie': FEEDBACKER_SESS+'='+sessionId});
        return res.end(page);
    } else {
        res.writeHead(401, {'Content-Type': 'text/html'});
        return res.end('Unauthorized');
    }
}

function getUserPage(req, res) {
    if (!getCurrentQuestion()) {
        res.writeHead(404, {'Content-Type': 'text/html'});
        res.end('<body>No presenter session initialized yet. </br> Please try later.<body/>');
        return;
    }

    console.log('========>>> generating user page.');
    userId += 1;
    var page = productionMode ? cachedPageHtml : fs.readFileSync(path.join(__dirname, 'page.html'), {encoding: 'utf8'});
    page = page.replace('<!-- session-id -->', 'happy-user-'+userId);
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(page);
    return;
}

function removeElementFrom(arr, ob) {
  var idx = arr.indexOf(ob);
  if(idx != -1) {
    arr.splice(idx, 1);
  }
}

function getPoll(req, res) {
    usersCount += 1;
    clientResponses.push(res);

    res.on('close', function(){
      usersCount -= 1;
      removeElementFrom(clientResponses, res);
    });
    res.on('finish', function(){
      usersCount -= 1;
      removeElementFrom(clientResponses, res);
    });

    console.log('>>>>', req.url, req.headers);
    res.writeHead(200, {'Content-Type': 'text/event-stream'});
    updateClients(clientResponses, getCurrentQuestion());
    return;
}

function postResponse (req, res) {
    var question = getCurrentQuestion();
    console.log('%%%%%%%%%%%%%%%% cookies:', req.cookies);
    var pollResponse = req.json;
    console.log('***** response: question:', pollResponse.question, 'response:', pollResponse.response);
    if(typeof pollResponse.question === 'number' && typeof pollResponse.response === 'number' ) {
        console.log('***** correct response: question:', pollResponse.question, 'response:', pollResponse.response);

        if(question.id === pollResponse.question && pollResponse.response <= question.responses.length - 1) {
            console.log('*** question and response found. counting.');
            question.responses[pollResponse.response].count += 1;
            updateClients(clientResponses, question);
            res.writeHead(200, "OK", {'Content-Type': 'text/html'});
        } else {
            var msg = "Not found: curr question: "+question.id+" max response: "+ question.responses.length -1;
            console.log('*** '+ msg);
            res.writeHead(404, msg, {'Content-Type': 'text/html'});
        }

    } else {
        var msg = ">>> could not parse question correctly :-(";
        console.log('====' + msg);
        res.writeHead(400, msg, {'Content-Type': 'text/html'});
    }
    res.end();

    return;

}

function postPing(req, res) {
  var urlPath = req.parsedUrl.pathname;
  var pingRequest = req.json;

  if (! sessionManager.getSession(pingRequest.sessionId)) {
      var msg = '%%%==> pingRequest NOT authorized: sessionId: '+pingRequest.sessionId;
      console.log(msg, pingRequest);

      res.writeHead(401, msg, {'Content-Type': 'text/html'});
      return res.end();
  }

  res.writeHead(200, "Done.", {'Content-Type': 'text/html'});
  res.end();

}

function postPagination(req, res){
    //curl -X POST --data '{"sessionId": "lksdjflsdkjf"}' http://localhost:8125/prev -v
    //curl -X POST --data '{"sessionId": "lksdjflsdkjf"}' http://localhost:8125/next -v
    var urlPath = req.parsedUrl.pathname;
    var isPageNextReq = urlPath.indexOf('next') !== -1;
    var pagingRequest = req.json;

    if (! sessionManager.getSession(pagingRequest.sessionId)) {
        var msg = '%%%==> pagingRequest NOT authorized: sessionId: '+pagingRequest.sessionId;
        console.log(msg, pagingRequest);

        res.writeHead(401, msg, {'Content-Type': 'text/html'});
        return res.end();
    }

    console.log('%%%==> pagingRequest authorized', pagingRequest, urlPath);
    res.writeHead(204, "Done.", {'Content-Type': 'text/html'});
    res.end();
    if(isPageNextReq) {
        console.log('=========>>>>> NEXT');
        var numberOfPolls = currentPoll.questions.length;
        if(currentQuestion < numberOfPolls -1) {
            currentQuestion += 1;
        }
    } else {
        console.log('=========>>>>> PREV');
        if(currentQuestion > 0) {
            currentQuestion -= 1;
        }
    }
    updateClients(clientResponses, getCurrentQuestion());

    return;
}


router.get('/index.html', getIndex);
router.get('/login', login);
router.get('/presenter', getIndex);
router.get('/poll', getPoll);
router.get('/join', getUserPage);
router.get('/', getUserPage);
router.post('/response', postResponse);
router.post('/next', postPagination);
router.post('/prev', postPagination);
router.post('/ping', postPing);

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8126;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || "0.0.0.0";

if (process.env.OPENSHIFT_NODEJS_PORT || process.env.PRODUCTION_MODE_ON) {
  productionMode = true;
  cachedPageHtml = fs.readFileSync(path.join(__dirname, 'page.html'), {encoding: 'utf8'});
  cachedPresenterSectionHtml = fs.readFileSync(path.join(__dirname, 'presenterSection.html'), {encoding: 'utf8'});
  console.log('---------- Production mode is ON. html is loaded once and not updated.');
} else {
  console.log('---------- Production mode is OFF. html is loaded on each request.');
}

http.createServer(router.route()).listen(server_port, server_ip_address);
console.log('Server running at http://'+server_ip_address+':'+server_port+'/');
