const { App } = require('@slack/bolt')
const { exec } = require('child_process')

const sendMessage = (message) => {
  exec(
    `imessage --text "${message}" --contacts '${process.env.FORWARDED_FOR}'`,
    (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`)
        return
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`)
        return
      }
      console.log(`stdout: ${stdout}`)
    }
  )
}

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
})

app.event('message', async ({ event, context }) => {
  console.log(event)
  // console.log(`${event.message.user} said ${message.text}`);
  if (event.type && event.text && event.type == 'message') {
    const result = await app.client.users.profile.get({
      // The token you used to initialize your app is stored in the `context` object
      token: context.botToken,
      user: event.user
    });
    sendMessage(`スラックから転送。 ${result.profile.display_name} 曰く、 ${event.text}`)
  }
})

;(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000)

  console.log('⚡️ Bolt app is running!')
})()
