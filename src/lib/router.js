var parseUrl = require('url').parse;

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
        try {
            req.json = JSON.parse(body);
        } catch (err) {}
        req.body = body;
        func(req, res);
    });
    return function(){};

}

var router = {
    getRoutes: [],
    postRoutes: [],
    post: function(path, func) {
        var expression = path;
        if (expression.constructor !== RegExp) {
            expression = new RegExp(expression);
        }
        this.postRoutes.push({path: expression, func: func})
    },
    get: function(path, func) {
        var expression = path;
        if (expression.constructor !== RegExp) {
            expression = new RegExp(expression);
        }
        this.getRoutes.push({path: expression, func: func})
    },
    routeFor: function(req, res){
        var route;
        var routesArrName = req.method.toLowerCase()+'Routes';
        var routes = this[routesArrName];
        var funcToApply = this.findMatch(routes, req);
        console.log(' ++ funcToApply', funcToApply.name);
        route = decorateWithBody(funcToApply, req, res);
        return route;
    },
    findMatch: function(routes, req){
        var url = req.parsedUrl.pathname;
        console.log('>>>> req.parsedUrl', url, req.method);
        var route = httpNotFound;
        var currRoute;
        for(var i = 0; i < routes.length; i ++){
            currRoute = routes[i];
            console.log('checking:', url, 'against:', currRoute.path);
            if (url.match(currRoute.path)) {
                console.log('Found route!');
                route = currRoute.func;
                break;
            }
        }
        return route;
    },
    parseCookies: function(req) {
        var parsedCookies = {};
        var reqCookies = req.headers.cookie;
        if (reqCookies) {
            var cookiesList = reqCookies.split(';').map(function (cookie) {
                return cookie.split('=');
            });

            console.log('////////////////////// splitted cookies:', cookiesList);
            for (var i = cookiesList.length - 1; i > -1; i--) {
                var cookie = cookiesList[i];
                var cookieName = cookie[0];
                var cookieValue = cookie[1];
                parsedCookies[cookieName] = cookieValue;
            }
        }
        return parsedCookies;
    },
    route: function() {
        return function(req, res) {
            req.parsedUrl = parseUrl(req.url, true);
            req.cookies = this.parseCookies(req);
            var func = this.routeFor(req, res);
            func(req, res);
        }.bind(this);
    }
};

function getInstance(){
    return router;
}

module.exports.getInstance = getInstance;
