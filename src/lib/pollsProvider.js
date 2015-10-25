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
                title: 'Do you really like JS?',
                id: 0,
                responses: [
                    {
                        id: 0,
                        text: "Yes. JS is amazing!",
                        count: 0
                    },
                    {
                        id: 1,
                        text: "Not a lot but allows coding everywhere",
                        count: 0
                    },
                    {
                        id: 2,
                        text: "Not bad...",
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
                title: 'Do you have experience with metaprogramming...',
                id: 1,
                responses: [
                    {
                        id: 0,
                        text: "I never metaprogrammed",
                        count: 0
                    },
                    {
                        id: 1,
                        text: "From time to time, not in JS",
                        count: 0
                    },
                    {
                        id: 2,
                        text: "From time to time, in JS",
                        count: 0
                    },
                    {
                        id: 3,
                        text: "Very frequently",
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
                title: "What's your opinion on ES6?",
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
