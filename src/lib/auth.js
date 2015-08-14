var presenterId = null;

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
    var authorized = user && pass && getUsers()[user] === pass;
    if (authorized) {
        presenterId = "" + Date.now();
    }
    console.log('<< user %s is authorized: %s', user, authorized);
    return authorized;
}

function isAuthorized(req) {
    var user=req.parsedUrl.query.user;
    var pass=req.parsedUrl.query.pass;
    return authorize(user, pass);
}

function getPresenterId() {
    return presenterId;
}

module.exports.isAuthorized = isAuthorized;
module.exports.getPresenterId = getPresenterId;