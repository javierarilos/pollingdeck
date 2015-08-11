#!/usr/bin/env node

var pollsProvider = require('./lib/pollsProvider');
var router = require('./lib/router').getInstance();

var http = require('http');
var fs = require('fs');
var path = require('path');

var FEEDBACKER_MASTER='fdbckr-master';

var presenterSessions = {};

function getUsers() {
    return {
        'secret': 'pass',
        'root': 'root',
        'javi': 'javi',
        'presenter1': 'presenter1',
        'presenter2': 'presenter2'
    }
}

function authorize(user, pass) {
    console.log('>> user %s trying to login', user);
    presenterId = ""+Date.now();
    var authorized = getUsers()[user] === pass;
    console.log('<< user %s is authorized: %s', user, authorized);
    return authorized;
}

var currentPollId = 0;
var currentUser;
var currentPoll;
var currentQuestion = 0;
var clientResponses = [];
var presenterId = null;
var users = 0;

function getCurrentQuestion() {
    return currentPoll.questions[currentQuestion];
}

function updateClients(responses, object) {
    responses.forEach(function (response) {
        response.write('data: '+JSON.stringify(object)+'\n\n');
    })
}

function newPresenterSession(user) {
    var sessionId = Date.now();
    presenterSessions[user] = {id: sessionId, user: user};
    return sessionId;
}

function getIndex(req, res) {
    console.log('%%%%%%%%%%%%%%%% cookies:', req.cookies);
    var page = fs.readFileSync(path.join(__dirname, 'page.html'), {encoding: 'utf8'});
    var user=req.parsedUrl.query.user;
    var pass=req.parsedUrl.query.pass;

    if (user && pass) {
        if ( authorize(user, pass)) {
            currentUser = user;
            currentPoll = pollsProvider.initPoll(currentUser, currentPollId);
            var sessionId = newPresenterSession(currentUser);
            page = page.replace('<!-- presenter-id -->', presenterId);
            //TODO: render an html piece in a page.
            var presenterButtonsHtml = '<span>Your session is: '+sessionId+'<br/></span></span><input type="button" id="page-prev" class="response-btn" name="prev" value="< prev" onclick="submitPagingRequest(\'prev\')">' +
                '<input type="button" id="page-next" class="response-btn" name="next" value="next >" onclick="submitPagingRequest(\'next\')">';
            page = page.replace('<!-- presenter-sect -->', presenterButtonsHtml);

            res.writeHead(200, {'Content-Type': 'text/html', 'Set-Cookie': FEEDBACKER_MASTER+'='+sessionId});
        } else {
            res.writeHead(401, {'Content-Type': 'text/html'});
            res.end('Unauthorized');
        }
    } else {
        console.log('========>>> generating user page.');
        users += 1;
        page = page.replace('<!-- presenter-id -->', 'happy-user-'+users);
        res.writeHead(200, {'Content-Type': 'text/html'});
    }

    return res.end(page);
}

function getPoll(req, res) {
    console.log('%%%%%%%%%%%%%%%% cookies:', req.cookies);
    clientResponses.push(res);
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
    //curl -X POST --data '{"userId": "lksdjflsdkjf"}' http://localhost:8125/prev -v
    //curl -X POST --data '{"userId": "lksdjflsdkjf"}' http://localhost:8125/next -v
    var urlPath = req.parsedUrl.pathname;
    var isPageNextReq = urlPath.indexOf('next') !== -1;

    var pagingRequest = req.json;
    if (pagingRequest.userId !== presenterId) {//TODO: proper auth system.
        var msg = '%%%==> pagingRequest NOT authorized: userId: '+pagingRequest.userId+' presenterId: ' + presenterId;
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

router.get('/', getIndex);
router.get('/index.html', getIndex);
router.get('/poll', getPoll);
router.post('/response', postResponse);
router.post('/next', postPagination);
router.post('/prev', postPagination);

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8126;
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || "0.0.0.0";

http.createServer(router.route()).listen(server_port, server_ip_address);
console.log('Server running at http://'+server_ip_address+':'+server_port+'/');
