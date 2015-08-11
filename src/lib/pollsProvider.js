var pollDefinitions = {
    javi: defaultPollDefinitions
};

var defaultPollDefinitions = [
    {
        id: 0,
        title: 'Talk on something very techie.',
        questions: [
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
        ]
    }
];

function getPollDefinitions(user) {
    var pollDefinitionsForUser = pollDefinitions[user];
    if (!pollDefinitionsForUser) {
        pollDefinitionsForUser = defaultPollDefinitions;
    }
    return pollDefinitionsForUser;
}

function initPoll(user, id){
    return JSON.parse(JSON.stringify(getPollDefinitions(user)[id]));
}

module.exports.getPollDefinitions = getPollDefinitions;
module.exports.initPoll = initPoll;