var presenterSessions = {};


function newPresenterSession(user) {
    var sessionId = Date.now();
    presenterSessions[sessionId] = {id: sessionId, user: user};
    return sessionId;
}

function getSession(sessionId) {
    return presenterSessions[sessionId];
}

function getSessionByUser(user) {
    var session = null;
    for (var sessionId in presenterSessions) {
        session = presenterSessions[sessionId];
        if(session.user === user) {
            break;
        }
    }
    return session;
}
module.exports.newPresenterSession = newPresenterSession;
module.exports.getSession = getSession;
module.exports.getSessionByUser = getSessionByUser;
