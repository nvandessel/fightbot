require('dotenv').config();

const { createEventAdapter } = require('@slack/events-api');
const { WebClient } = require('@slack/web-api');
const passport = require('passport');
const LocalStorage = require('node-localstorage').LocalStorage;
const SlackStrategy = require('@aoberoi/passport-slack').default.Strategy;
const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');

const fs = require('fs');
const creds = JSON.parse(fs.readFileSync('secrets.json'));

// *** Initialize event adapter using signing secret from environment variables ***
const slackEvents = createEventAdapter(creds.SLACK_SIGNING_SECRET, {
  includeBody: true
});

// Initialize a Local Storage object to store authorization info
// NOTE: This is an insecure method and thus for demo purposes only!
const botAuthorizationStorage = new LocalStorage('./storage');

// Helpers to cache and lookup appropriate client
// NOTE: Not enterprise-ready. if the event was triggered inside a shared channel, this lookup
// could fail but there might be a suitable client from one of the other teams that is within that
// shared channel.
const clients = {};
function getClientByTeamId(teamId) {
  if (!clients[teamId] && botAuthorizationStorage.getItem(teamId)) {
    clients[teamId] = new WebClient(botAuthorizationStorage.getItem(teamId));
  }
  if (clients[teamId]) {
    return clients[teamId];
  }
  return null;
}

// Initialize Add to Slack (OAuth) helpers
passport.use(new SlackStrategy({
  clientID: creds.SLACK_CLIENT_ID,
  clientSecret: creds.SLACK_CLIENT_SECRET,
  skipUserProfile: true,
}, (accessToken, scopes, team, extra, profiles, done) => {
  botAuthorizationStorage.setItem(team.id, extra.bot.accessToken);
  done(null, {});
}));

// Initialize an Express application
const app = express();

// Plug the Add to Slack (OAuth) helpers into the express app
app.use(passport.initialize());
app.get('/', (req, res) => {
  res.send('<a href="/auth/slack"><img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" /></a>');
});
app.get('/auth/slack', passport.authenticate('slack', {
  scope: ['bot']
}));
app.get('/auth/slack/callback',
  passport.authenticate('slack', { session: false }),
  (req, res) => {
    res.send('<p>Fight Bot was successfully installed on your team.</p>');
  },
  (err, req, res, next) => {
    res.status(500).send(`<p>Fight Bot failed to install</p> <pre>${err}</pre>`);
  }
);

// *** Plug the event adapter into the express app as middleware ***
app.use('/slack/events', slackEvents.expressMiddleware());

app.post('/slack/command', bodyParser.urlencoded({ extended: false }), slackSlashCommand);

// *** Attach listeners to the event adapter ***

// *** Greeting any user that says "hi" ***
slackEvents.on('message', (message, body) => {
  // Only deal with messages that have no subtype (plain messages) and contain 'hi'
  if (!message.subtype && message.text.indexOf('hi') >= 0) {
    // Initialize a client
    const slack = getClientByTeamId(body.team_id);
    // Handle initialization failure
    if (!slack) {
      return console.error('No authorization found for this team. Did you install the app through the url provided by ngrok?');
    }

    (async () => {
      try {
        // Respond to the message back in the same channel
        const response = await slack.chat.postMessage({ channel: message.channel, text: `Hello <@${message.user}>! :tada:` });
      } catch (error) {
        console.log(error.data);
      }
    })();
  }
});

// *** Responding to reactions with the same emoji ***
slackEvents.on('reaction_added', (event, body) => {
  // Initialize a client
  const slack = getClientByTeamId(body.team_id);
  // Handle initialization failure
  if (!slack) {
    return console.error('No authorization found for this team. Did you install the app through the url provided by ngrok?');
  }
  // Respond to the reaction back with the same emoji

  (async () => {
    try {
      // Respond to the message back in the same channel
      const response = await slack.chat.postMessage({ channel: event.item.channel, text: `Nerd :${event.reaction}:` });
    } catch (error) {
      console.log(error.data);
    }
  })();
});

function testFight(players)  
{
  const winner = players[Math.floor(Math.random() * players.length)];
  
  const t = `${players[0]} vs ${players[1]} \n Winner is ${winner}`;
  return {
    text: t,
    response_type: 'in_channel'
  };
};

function randomFight()  
{
  const p1 = `:${returnRandomFromArray(names)}-p1:`;
  const p2 = `:${returnRandomFromArray(names)}-p2:`;
  const players = [p1, p2]
  const winner = returnRandomFromArray(players);
  
  const t = `${players[0]} vs ${players[1]} \n Winner is ${winner}`;
  return {
    text: t,
    response_type: 'in_channel'
  };
};

function returnRandomFromArray(arr)
{
  return arr[Math.floor(Math.random() * arr.length)]
}

const names = [
  'akuma',
  'balrog',
  'blanka',
  'cammy',
  'chun-li',
  'cyrax',
  'deejay',
  'dhalsim',
  'e-honda',
  'goro',
  'guile',
  'johnny-cage',
  'ken',
  'link',
  'liu-kang',
  'm-bison',
  'ness',
  'raiden',
  'reptile',
  'ryu',
  'sagat',
  'scorpion',
  'shang-tsung',
  'snake',
  'sonya',
  'sub-zero',
  'vega',
  'zangief'];

// Slack slash command handler
function slackSlashCommand(req, res, next) {
  if (req.body.command === '/fight') {
    const args = req.body.text.split(' ');
    if (args.length == 2) {
      res.json(testFight(args));
    } else {
      res.json(randomFight());
    }
  } else {
    next();
  }
}

// *** Handle errors ***
slackEvents.on('error', (error) => {
  if (error.code === slackEventsApi.errorCodes.TOKEN_VERIFICATION_FAILURE) {
    // This error type also has a `body` propery containing the request body which failed verification.
    console.error(`An unverified request was sent to the Slack events Request URL. Request body: \
${JSON.stringify(error.body)}`);
  } else {
    console.error(`An error occurred while handling a Slack event: ${error.message}`);
  }
});

// Start the express application
const port = process.env.PORT || 3000;
http.createServer(app).listen(port, () => {
  console.log(`server listening on port ${port}`);
});
