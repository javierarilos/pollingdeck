var http = require('http');
var fs = require('fs');
var path = require('path');
var parseUrl = require('url').parse;

function getPolls(){
    return [
        {
            type: 'update',
            title: 'Do you like JS?',
            id: 0,
            responses: [
                {
                    id: 0,
                    text: "Yes! JS is amazing. Best ever!",
                    count: 0
                },
                {
                    id: 1,
                    text: "Yes... but it has its pros and cons...",
                    count: 0
                },
                {
                    id: 2,
                    text: "Not a lot... coding everywhere with the same language helps.",
                    count: 0
                },
                {
                    id: 3,
                    text: "Nope! it is such an ugly language!",
                    count: 0
                }
            ]
        },
        {
            type: 'update',
            title: 'JS, Python or Java?',
            id: 1,
            responses: [
                {
                    id: 0,
                    text: "JS always!",
                    count: 0
                },
                {
                    id: 1,
                    text: "Python, batteries included.",
                    count: 0
                },
                {
                    id: 2,
                    text: "Java & XML for the win.",
                    count: 0
                },
                {
                    id: 3,
                    text: "Those are toys... I prefer BrainFuck",
                    count: 0
                }
            ]
        }
    ];
}

var polls = getPolls();
var currentPoll = 0;
var clientResponses = [];
var presenterId = null;
var users = 0;

function getCurrentPoll() {
    return polls[currentPoll];
}

function updateClients(responses, object) {
    responses.forEach(function (response) {
        response.write('data: '+JSON.stringify(object)+'\n\n');
    })
}

function httpNotFound(req, res) {
    res.writeHead(404);
    res.end();
}

function decorateWithBody(func, req, res) {
    var body = '';
    req.on('data', function(chunk) {
        body += chunk;
    });

    req.on('end', function() {
        req.json = JSON.parse(body);
        req.body = body;
        func(req, res);
    });
    return function(){};

}

var router = {
    getRoutes: [],
    postRoutes: [],
    post: function(path, func) {
        this.postRoutes.push({path: path, func: func})
    },
    get: function(path, func) {
        this.getRoutes.push({path: path, func: func})
    },
    routeFor: function(req, res){
        var route;
        switch (req.method) {
            case 'GET':
                var routes = this.getRoutes;
                route = this.findMatch(routes, req);
                break;
            case 'POST':
                routes = this.postRoutes;

                var funcToApply = this.findMatch(routes, req);
                console.log(' ++ funcToApply', funcToApply.name);
                route = decorateWithBody(funcToApply, req, res);
                break;
        }

        return route;

    },
    findMatch: function(routes, req){
        var url = req.parsedUrl.pathname;
        console.log('>>>> req.parsedUrl', url, req.method);
        var route = httpNotFound;
        var currRoute;
        //return this.getRoutes[0].func; //TODO: IMPLEMENT.
        for(var i = 0; i < routes.length; i ++){
            currRoute = routes[i];
            console.log('checking:', url, 'against:', currRoute.path);
            if (currRoute.path === url) {
                console.log('Found route!');
                route = currRoute.func;
                break;
            }
        }
        return route;
    },
    route: function() {
        return function(req, res) {
            req.parsedUrl = parseUrl(req.url, true);
            var urlPath = req.parsedUrl.pathname;
            var func = this.routeFor(req, res);
            func(req, res);
        }.bind(this);
    }
};

function getIndex(req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    var page = fs.readFileSync(path.join(__dirname, 'page.html'), {encoding: 'utf8'});

    if(req.parsedUrl.query.presenter === 'secret') {
        console.log('========>>> generating presenter page.');//TODO: templating?
        presenterId = ""+Date.now();
        page = page.replace('<!-- presenter-id -->', presenterId);
        //TODO: render an html piece in a page.
        var presenterButtonsHtml =  '<input type="button" id="page-prev" class="response-btn" name="prev" value="< prev" onclick="submitPagingRequest(\'prev\')">' +
            '<input type="button" id="page-next" class="response-btn" name="next" value="next >" onclick="submitPagingRequest(\'next\')">';
        page = page.replace('<!-- presenter-sect -->', presenterButtonsHtml);
    } else {
        console.log('========>>> generating user page.');
        users += 1;
        page = page.replace('<!-- presenter-id -->', 'happy-user-'+users);
    }

    return res.end(page);
}

function getPoll(req, res) {
    clientResponses.push(res);
    console.log('>>>>', req.url, req.headers);
    res.writeHead(200, {'Content-Type': 'text/event-stream'});

    updateClients(clientResponses, getCurrentPoll());
    return;
}

function postResponse (req, res) {
    var poll = getCurrentPoll();
    var pollResponse = req.json;
    console.log('***** response: question:', pollResponse.question, 'response:', pollResponse.response);
    if(typeof pollResponse.question === 'number' && typeof pollResponse.response === 'number' ) {
        console.log('***** correct response: question:', pollResponse.question, 'response:', pollResponse.response);

        if(poll.id === pollResponse.question && pollResponse.response <= poll.responses.length - 1) {
            console.log('*** question and response found. counting.');
            poll.responses[pollResponse.response].count += 1;
            updateClients(clientResponses, poll);
            res.writeHead(200, "OK", {'Content-Type': 'text/html'});
        } else {
            var msg = "Not found: curr poll: "+poll.id+" max response: "+ poll.responses.length -1;
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
    var isPagePrevReq = urlPath.indexOf('prev') !== -1;

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
        var numberOfPolls = polls.length;
        if(currentPoll < numberOfPolls -1) {
            currentPoll += 1;
        }
    } else {
        console.log('=========>>>>> PREV');
        if(currentPoll > 0) {
            currentPoll -= 1;
        }
    }
    updateClients(clientResponses, getCurrentPoll());

    return;
}

router.get('/', getIndex);
router.get('/index.html', getIndex);
router.get('/poll', getPoll);
router.post('/response', postResponse);
router.post('/next', postPagination);
router.post('/prev', postPagination);

http.createServer(router.route()).listen(8126, "0.0.0.0");

http.createServer(function (req, res) {

    var parsedUrl = require('url').parse(req.url, true);
    req.parsedUrl = parseUrl(req.url, true);
    var urlPath = parsedUrl.pathname;
    if (urlPath == '/' || urlPath.indexOf('index.html') !== -1) {
        getIndex(req, res);
    }


    if (urlPath.indexOf('poll') !== -1) {
        clientResponses.push(res);
        console.log('>>>>', req.url, req.headers);
        res.writeHead(200, {'Content-Type': 'text/event-stream'});

        updateClients(clientResponses, getCurrentPoll());
        return;
    }

    if (req.method === 'POST' && urlPath.indexOf('response') !== -1) {
        //curl -X POST --data '{"question": 0, "response": 2}' http://localhost:8125/response
        var body = '';
        req.on('data', function(chunk) {
            console.log("Received body data:");
            body += chunk;
        });

        req.on('end', function() {
            var poll = getCurrentPoll();
            // empty 200 OK response for now
            console.log('************************************************************* POST FINISHED');
            console.log('*****', body);
            var pollResponse = JSON.parse(body);
            console.log('***** response: question:', pollResponse.question, 'response:', pollResponse.response);
            if(typeof pollResponse.question === 'number' && typeof pollResponse.response === 'number' ) {
                console.log('***** correct response: question:', pollResponse.question, 'response:', pollResponse.response);

                if(poll.id === pollResponse.question && pollResponse.response <= poll.responses.length - 1) {
                    console.log('*** question and response found. counting.');
                    poll.responses[pollResponse.response].count += 1;
                    updateClients(clientResponses, poll);
                    res.writeHead(200, "OK", {'Content-Type': 'text/html'});
                } else {
                    var msg = "Not found: curr poll: "+poll.id+" max response: "+ poll.responses.length -1;
                    console.log('*** '+ msg);
                    res.writeHead(404, msg, {'Content-Type': 'text/html'});
                }

            } else {
                var msg = ">>> could not parse question correctly :-(";
                console.log('====' + msg);
                res.writeHead(400, msg, {'Content-Type': 'text/html'});
            }
            res.end();
        });
        return;
    }

    var isPageNextReq = urlPath.indexOf('next') !== -1;
    var isPagePrevReq = urlPath.indexOf('prev') !== -1;

    if (req.method === 'POST' && (isPageNextReq || isPagePrevReq)) {//TODO: proper req routing.
        //curl -X POST --data '{"userId": "lksdjflsdkjf"}' http://localhost:8125/prev -v
        //curl -X POST --data '{"userId": "lksdjflsdkjf"}' http://localhost:8125/next -v
        var body = '';
        req.on('data', function(chunk) {
            body += chunk;
        });

        req.on('end', function() {

            var pagingRequest = JSON.parse(body);
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
                var numberOfPolls = polls.length;
                if(currentPoll < numberOfPolls -1) {
                    currentPoll += 1;
                }
            } else {
                console.log('=========>>>>> PREV');
                if(currentPoll > 0) {
                    currentPoll -= 1;
                }
            }
            updateClients(clientResponses, getCurrentPoll());

            return;
        });
        return;
    }

    res.writeHead(404);
    res.end();

}).listen(8125, "0.0.0.0");
console.log('Server running at http://0.0.0.0:8125/');