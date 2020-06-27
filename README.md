# slack2message

A bridge between slack and message.

## Installation

OS X:

```sh
brew install imessage-ruby
git clone git@github.com:hgwr/slack2message.git
```

see https://slack.dev/bolt-js/tutorial/getting-started and create slack App.

```sh
cp .envrc.exapme .envrc
```

Set the forwarding address or telephone number to `FORWARDED_FOR`.

```sh
vi .envrc
```

### Slack permissions

- Event Subscriptions
  - message.channels
- Bot Token Scopes
  - users.profile:read

## Running

```sh
node index.js
```

In another terminal:

```sh
ngrok http 3000
```

You get the public URL, so set the URL in Slack app "Event Subscriptions" page.

## Release History

* 0.0.1
    * CHANGE: Initial version

## Meta

Shigeru Hagiwara – hgwrsgr@gmail.com

Distributed under the MIT license.
