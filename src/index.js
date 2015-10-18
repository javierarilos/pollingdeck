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

var currentPollId = 0;
var currentUser;
var currentPoll;
var currentQuestion = 0;
var clientResponses = [];
var users = 0;
var lastUpdateClientsTs = 0;
var scheduledClientUpdate = null;

function getCurrentQuestion() {
    if (!currentPoll || !currentPoll.questions) {
        return null;
    }

    return currentPoll.questions[currentQuestion];
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

function getIndex(req, res) {
    console.log('%%%%%%%%%%%%%%%% cookies:', req.cookies);
    var page = fs.readFileSync(path.join(__dirname, 'page.html'), {encoding: 'utf8'});
    if (auth.isAuthorized(req)) {
        currentUser = req.parsedUrl.query.user;
        currentPoll = pollsProvider.initPoll(currentUser, currentPollId);
        var sessionId = sessionManager.newPresenterSession(currentUser);
        page = page.replace('<!-- session-id -->', sessionId);
        //TODO: render an html piece in a page.
        var presenterButtonsHtml = '<span>Your session is: '+sessionId+'<br/></span></span><input type="button" id="page-prev" class="response-btn" name="prev" value="< prev" onclick="submitPagingRequest(\'prev\')">' +
            '<input type="button" id="page-next" class="response-btn" name="next" value="next >" onclick="submitPagingRequest(\'next\')">';
        page = page.replace('<!-- presenter-sect -->', presenterButtonsHtml);

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
    users += 1;
    var page = fs.readFileSync(path.join(__dirname, 'page.html'), {encoding: 'utf8'});
    page = page.replace('<!-- session-id -->', 'happy-user-'+users);
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
    console.log('%%%%%%%%%%%%%%%% cookies:', req.cookies);
    clientResponses.push(res);
    res.on('close', function(){
      removeElementFrom(clientResponses, res);
    });

    res.on('finish', function(){
      removeElementFrom(clientResponses, res);
    });


    console.log('>>>>', req.url, req.headers);
    res.writeHead(200, {'Content-Type': 'text/event-stream'});
    var currQuestion = getCurrentQuestion();
    console.log('#############################################################currQuestion', currQuestion);
    updateClients(clientResponses, currQuestion);
    return;
}

function postResponse (req, res) {
    var question = getCurrentQuestion();
    console.log('%%%%%%%%%%%%%%%% cookies:', req.cookies);
    var pollResponse = req.json;
    console.log('***** response: question:', pollResponse.question, 'response:', pollResponse.response);
    console.log('***** req.cookies:', req.headers.cookie);
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

function postPagination(req, res){
    //curl -X POST --data '{"sessionId": "lksdjflsdkjf"}' http://localhost:8125/prev -v
    //curl -X POST --data '{"sessionId": "lksdjflsdkjf"}' http://localhost:8125/next -v
    var urlPath = req.parsedUrl.pathname;
    var isPageNextReq = urlPath.indexOf('next') !== -1;
    var pagingRequest = req.json;

    if (! sessionManager.getSession(pagingRequest.sessionId)) {
        var msg = '%%%==> pagingRequest NOT authorized: sessionId: '+pagingRequest.sessionId+' presenterId: ' + sessionManager.getSession(pagingRequest.sessionId);
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
router.get('/poll', getPoll);
router.get('/join', getUserPage);
router.get('/', getIndex);
router.post('/response', postResponse);
router.post('/next', postPagination);
router.post('/prev', postPagination);

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8126;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || "0.0.0.0";

http.createServer(router.route()).listen(server_port, server_ip_address);
console.log('Server running at http://'+server_ip_address+':'+server_port+'/');
