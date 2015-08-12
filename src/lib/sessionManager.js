var presenterSessions = {};


function newPresenterSession(user) {
    var sessionId = Date.now();
    presenterSessions[user] = {id: sessionId, user: user};
    return sessionId;
}

module.exports.newPresenterSession = newPresenterSession;