var http = require('http');
var fs = require('fs');
var path = require('path');

function getNewPoll(){
    return {
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
        ]};
}

var poll = null;
var clientResponses = [];
var helloInterval = null;


function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function randomUpdatePoll(pollToUpdate){
    var responseVoted = getRandomInt(0, pollToUpdate.responses.length);
    console.log('+ updating poll response:', responseVoted);
    pollToUpdate.responses[responseVoted].count += 1;
}

function updateClients(responses, object) {
    responses.forEach(function (response) {
        response.write('data: '+JSON.stringify(object)+'\n\n');
    })
}

function endClients(responses, object) {
    responses.forEach(function (response) {
        response.end('data: '+JSON.stringify(object)+'\n\n');
    })
}

http.createServer(function (req, res) {

    var parsedUrl = require('url').parse(req.url, true);
    var urlPath = parsedUrl.pathname;
    if (urlPath == '/' || urlPath.indexOf('index.html') !== -1) {
        res.writeHead(200, {'Content-Type': 'text/html'});
        var page = fs.readFileSync(path.join(__dirname, 'page.html'));
        return res.end(page);
    }


    if (urlPath.indexOf('poll') !== -1) {

        clientResponses.push(res);
        console.log('>>>>', req.url, req.headers);
        console.log('>>>>', req.headers);
        console.log('>>>>', parsedUrl);
        res.writeHead(200, {'Content-Type': 'text/event-stream'});
        updateClients([res], poll);

        if (!helloInterval) {
            poll = getNewPoll();
            console.log('############################################################# about to prepare intervals');
            helloInterval = setInterval(function () {
                //randomUpdatePoll(poll);
                updateClients(clientResponses, poll);
            }, 1000);

            var tout = parsedUrl.query.tout || 5000;
            setTimeout(function () {
                clearInterval(helloInterval);
                helloInterval = null;
                endClients(clientResponses, {"type": "close"});
                clientResponses = [];
            }, 50000); //TODO. HARDCODED
        }
        return;
    }

    if (req.method === 'POST' && urlPath.indexOf('response') !== -1) {
        var body = '';
        req.on('data', function(chunk) {
            console.log("Received body data:");
            body += chunk;
        });

        req.on('end', function() {
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

    res.writeHead(404);
    res.end();

}).listen(8125, "127.0.0.1");
console.log('Server running at http://127.0.0.1:8125/');