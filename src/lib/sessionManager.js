var presenterSessions = {};


function newPresenterSession(user) {
    var sessionId = Date.now();
    presenterSessions[sessionId] = {id: sessionId, user: user};
    return sessionId;
}

function getSession(sessionId) {
    return presenterSessions[sessionId];
}

function getSessions() {
    return presenterSessions;
}

function existsSession(sessionId) {
    return getSession(sessionId) == null || getSession(sessionId) == undefined;
}

function getSessionByUser(user) {
    var session;
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
module.exports.getSessions = getSessions;
module.exports.existsSession = getSession;
module.exports.getSessionByUser = getSessionByUser;
