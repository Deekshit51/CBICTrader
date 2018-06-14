var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');
var cur_code;
var url;

var convertionrate;
// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Receive messages from the user and respond by echoing each message back (prefixed with 'You said:')
/*
var bot = new builder.UniversalBot(connector, function (session) {
    session.send("You said: %s", session.message.text);
});
*/
var inMemoryStorage = new builder.MemoryBotStorage();

var inputItems = { 
    "Yes": {
        item: "yes"
    },
    "No": {
        item: "no"
    },
}

// This is a dinner reservation bot that uses multiple dialogs to prompt users for input.
var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.send("Welcome to the CBIC Trader interaction Bot.");
        session.beginDialog('askForAccount');
    },
    function (session, results) {
        session.dialogData.isAccountPresent = results.response.entity;
        session.beginDialog('askForExchRate');
    },
    function (session, results,next) {
        session.dialogData.isRateAvailable = results.response.entity;
        var isAccPresent = session.dialogData.isAccountPresent.toString().trim();
        if (isAccPresent === "yes") {
            session.beginDialog('askForCustomerCode');
        }
        else{
            next();
        }
    },
    function (session, results,next) {
        session.dialogData.CustomerCode = results.response;
        var isRatePresent = session.dialogData.isRateAvailable.toString().trim();
        if (isRatePresent === "yes") {
            session.beginDialog('askForRate');
        }
        else{
            next();
        }
    },
    function (session, results) {
        session.dialogData.estRate = results.response;
        session.beginDialog('askForBaseCUR');
    },
    function (session, results) {
        session.dialogData.srccur = results.response;
        session.beginDialog('askForTargetCUR');
    },
    
    function (session, results) {
        session.dialogData.tarcur = results.response;
        url="http://free.currencyconverterapi.com/api/v5/convert?q=code&compact=y";
        cur_code=session.dialogData.srccur+"_"+session.dialogData.tarcur;
        url=url.replace("code",cur_code);
        
        console.log(url);
        
           
            session.beginDialog('askForConfirmation');
        // Process request and display reservation details
        
    },
    
    function (session, results) {
        session.dialogData.confirmation = results.response.entity;
        var confirmation = session.dialogData.confirmation.toString().trim();
        console.log("Confirmation : "+confirmation);
        if (confirmation === "confirm") {
        /*session.send(`Reservation confirmed. Reservation details: <br/>Date/Time: ${session.dialogData.isAccountPresent} <br/>Party size: ${session.dialogData.isRateAvailable} <br/>Customer Code: ${session.dialogData.CustomerCode}`);*/
        session.send("Kudos! The contract has been booked with the number :"+Math.floor(Math.random() * (10000 - 1000) + 1000));
        session.send("Thanks for reaching us let us know if you have any other queries");
        }
        else{
            session.send("Okay! not an issue, you can reach out to us whenever you have a re-thinking.");
        }
        session.endDialog();
    }
]).set('storage', inMemoryStorage); // Register in-memory storage 

// Dialog to ask for a date and time
bot.dialog('askForAccount', [
    function (session) {
        builder.Prompts.choice(session, "Do you have an account with CBIC :", "yes|no", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
]);

// Dialog to ask for number of people in the party
bot.dialog('askForExchRate', [
    function (session) {
        //builder.Prompts.text(session, "Do you have an exchange rate that you would like to match or beat (yes/no) ?");
        builder.Prompts.choice(session, "Do you have an exchange rate that you would like to match or beat:", "yes|no", { listStyle: builder.ListStyle.button });
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
])

// Dialog to ask for the reservation name.
bot.dialog('askForCustomerCode', [
    function (session) {
        builder.Prompts.text(session, "May i know the customer Code?");
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
])

// Dialog to ask for the reservation name.
bot.dialog('askForRate', [
    function (session) {
        builder.Prompts.text(session, "What is your exchange estimation rate?");
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
])

bot.dialog('askForBaseCUR', [
    function (session) {
        builder.Prompts.text(session, "What is your source Currency code?");
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
])

bot.dialog('askForTargetCUR', [
    function (session) {
        builder.Prompts.text(session, "What is your targetted Currency code?");
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
])

bot.dialog('askForConfirmation', [
    function (session) {
        request(url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log("inside");
                var obj = JSON.parse(body)
                console.log("convertionrate:"+obj[cur_code]['val']);
                //session.send("The current Conversion rate for trading is :"+obj[cur_code]['val']);
                convertionrate=obj[cur_code]['val'];
                console.log("ending");
                builder.Prompts.choice(session, "The Current Conversion rate is :"+convertionrate+", what's your take on this?", "confirm|reject", { listStyle: builder.ListStyle.button });
            }
        });
        
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
]);