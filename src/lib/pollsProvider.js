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
                        text: "Yes. JS is amazing!",
                        count: 0
                    },
                    {
                        id: 1,
                        text: "Not bad...",
                        count: 0
                    },
                    {
                        id: 2,
                        text: "No, but allows coding everywhere",
                        count: 0
                    },
                    {
                        id: 3,
                        text: "Nope! it is so ugly!",
                        count: 0
                    }
                ]
            },
            {
                type: 'update',
                title: 'What programming language would you like to use...',
                id: 1,
                responses: [
                    {
                        id: 0,
                        text: "JS always!",
                        count: 0
                    },
                    {
                        id: 1,
                        text: "Python, batteries included",
                        count: 0
                    },
                    {
                        id: 2,
                        text: "Java (no XML) for the win",
                        count: 0
                    },
                    {
                        id: 3,
                        text: "I love functional",
                        count: 0
                    }
                ]
            },
            {
                type: 'update',
                title: 'Have you ever used eval?',
                id: 2,
                responses: [
                    {
                        id: 0,
                        text: "Yes, and it was a legitimate use",
                        count: 0
                    },
                    {
                        id: 1,
                        text: "Yes, but don't tell anybody",
                        count: 0
                    },
                    {
                        id: 2,
                        text: "No, but I was tempted",
                        count: 0
                    },
                    {
                        id: 3,
                        text: "No, never needed it",
                        count: 0
                    },
                ]
            },
            {
                type: 'update',
                title: "What do you think your opinion about ES6?",
                id: 3,
                responses: [
                    {
                        id: 0,
                        text: "I'm thrilled with ES6",
                        count: 0
                    },
                    {
                        id: 1,
                        text: "So-so, but love classes",
                        count: 0
                    },
                    {
                        id: 2,
                        text: "I hate classes!",
                        count: 0
                    },
                    {
                        id: 3,
                        text: "JS's becoming too complex",
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
