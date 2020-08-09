const { App } = require('@slack/bolt')
const { spawn } = require('child_process')
const { syncProcessLoop } = require ('./sync')

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
})

const sendMessage = (message) => {
  // Note that the arguments are in an array, not using string interpolation
  console.log(new Date(), '[DEBUG] sending message: ', message);
  const cmd = spawn('imessage', [
    '--text',
    message,
    '--contacts',
    process.env.FORWARDED_FOR,
  ])
  cmd.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`)
  })
  cmd.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`)
  })
  cmd.on('close', (code) => {
    console.log(`child process exited with code ${code}`)
  })
}

const getName = async (token, user) => {
  const result = await app.client.users.profile.get({
    token: token,
    user: user,
  })
  let name = '名前取得できず'
  if (result.profile && result.profile.real_name) {
    name = result.profile.real_name
  }
  if (result.profile && result.profile.display_name) {
    name = result.profile.display_name
  }
  return name
}

app.event('message', async ({ event, context }) => {
  console.log(event)
  // console.log(`${event.message.user} said ${message.text}`);
  if (event.type != 'message') {
    return
  }
  const name = await getName(context.botToken, event.user)
  let text = event.text
  if (event.subtype == 'file_share') {
    sendMessage(
      `スラックから転送。 ${name} がファイルを共有しました。ここには表示されません。`
    )
  }
  if (event.text) {
    sendMessage(`スラックから転送。 ${name} 曰く、 ${text}`)
  } else {
    console.log(`[DEBUG] No message was sent.`)
  }
})

app.error((error) => {
  // メッセージ再送信もしくはアプリを停止するかの判断をするためにエラーの詳細を出力して確認
  console.error(error);
});

app.use(syncProcessLoop(app));

// run main
;(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000)
  console.log('⚡️ Bolt app is running!')
})()
