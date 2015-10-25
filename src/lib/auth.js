function getUsers() {
    return {
        'secret': 'pass',
        'root': 'root',
        'presenter1': 'presenter1',
        'presenter2': 'presenter2'
    }
}

function authorize(user, pass) {
    console.log('>> user %s trying to login', user);
    var authorized = user && pass && getUsers()[user] === pass;
    console.log('<< user %s is authorized: %s', user, authorized);
    return authorized;
}

function isAuthorized(req) {
    var user=req.parsedUrl.query.user;
    var pass=req.parsedUrl.query.pass;
    console.log('Trying to authorize:::: ', user, pass);
    return authorize(user, pass);
}

module.exports.isAuthorized = isAuthorized;
