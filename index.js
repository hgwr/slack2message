const { App } = require('@slack/bolt')
const { spawn } = require('child_process')
const sqlite3 = require('sqlite3')
const { open } = require('sqlite')

// Initializes your app with your bot token and signing secret
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
})

const sendMessage = (message) => {
  // Note that the arguments are in an array, not using string interpolation
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

async function dbConnection({ payload, context, say, next }) {
  const slackUserId = payload.user

  try {
    const botDb = await open({
      filename: './db/bot.db',
      driver: sqlite3.Database,
    })
    context.botDb = botDb
    const messageDb = await open({
      filename: process.env.MESSAGE_DB_PATH,
      driver: sqlite3.Database,
    })
    context.messageDb = messageDb
  } catch (error) {
    await say(
      `Slack2message ボットです。エラー：このボットが使うデータベースに接続できませんでした。 <@${slackUserId}> `
    )
    console.log('エラー：このボットが使うデータベースに接続できませんでした。')
    console.log(error)
    return
    // throw error;
  }
  await next()
}

app.use(dbConnection)

const querySql = `
select m.rowid,
  guid,
  text,
  handle_id,
  subject,
  m.date
from message m
  inner join handle h on m.handle_id = h.rowid
where h.id = ?
  and m.is_from_me = 0
order by date desc
limit 100;
    `

const insertSql = `
insert into message (guid, text, handle_id, subject, date)
select :guid,
  :text,
  :handle_id,
  :subject,
  :date
where not exists(
    select 1
    from message
    where guid = :guid
  )
    `

async function syncMessage({ context, next }) {
  try {
    const result = await context.messageDb.all(
      querySql,
      process.env.MONITORED_PHONE_NUMBER
    )
    result.forEach(async (row) => {
      const insertResult = await context.botDb.run(insertSql, {
        ':guid': row.guid,
        ':text': row.text,
        ':handle_id': row.handle_id,
        ':subject': row.subject,
        ':date': row.date
      })
    })
  } catch (error) {
    console.log('エラー：メッセージDBとボットDBを同期できませんでした。')
    console.log(error)
    throw error;
  }
  await next()
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

// run main
;(async () => {
  // Start your app
  await app.start(process.env.PORT || 3000)

  console.log('⚡️ Bolt app is running!')
})()
