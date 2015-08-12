var presenterSessions = {};


function newPresenterSession(user) {
    var sessionId = Date.now();
    presenterSessions[sessionId] = {id: sessionId, user: user};
    return sessionId;
}

module.exports.newPresenterSession = newPresenterSession;