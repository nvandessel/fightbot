# FightBot

A simple bot using the [Slack Event Adapter](https://github.com/slackapi/node-slack-events-api) and [ngrok](https://ngrok.com/).

## Setup

### Create a Slack app
1. Create an app at [api.slack.com/apps](https://api.slack.com/apps)
2. Click on `Bot Users` on the left side navigation
3. Give your bot user a name (e.g. "@fightbot"), turn _Always Show My Bot as Online_ on, and save your
changes

### Run locally

1. Get the code
	- Clone this repo and run `npm install`
2. Create a `secrets.json` file in the root directory and set the following environment variables
	- `SLACK_CLIENT_ID`: You app's _Client ID_
	- `SLACK_CLIENT_SECRET`: Your app's _Client Secret_
	- `SLACK_SIGNING_SECRET`: Your app's _Signing Secret_
3. Run the app:
	- Start the app (`node index.js`)
	- In another window, start ngrok on the same port as your webserver (`ngrok http $PORT`)

### Enable Events
1. Go back to the app settings and click on `Event Subscriptions` on the left side navigation
2. Enable events and enter your _Request URL_:
	- ngrok Forwarding URL + `/slack/events`
3. After you set up the _Request URL_, you should add event subscriptions under the "Bot Events" category. Add `message.channels` and `reaction_added`.
4. Go to `OAuth & Permissions` item on the left side navigation, and input the _Redirect URL_:
	- ngrok Forwarding URL + `/auth/slack/callback`

## Installation and Usage
1.  Visit the URL of your development proxy
	- ngrok Forwarding URL
2. Click the "Add to Slack" button, and complete the installation
3. You can use the Bot with slash commands (e.g. `/fight :p1: :p2:`). The bot should randomly pick a winner.
