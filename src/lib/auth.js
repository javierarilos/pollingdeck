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

function isAuthorized(req) {
    var user=req.parsedUrl.query.user;
    var pass=req.parsedUrl.query.pass;
    return authorize(user, pass);
}

module.exports.isAuthorized = isAuthorized;