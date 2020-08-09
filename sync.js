const sqlite3 = require('sqlite3')
const { open } = require('sqlite')

let syncStarted = false
let app = null

async function dbConnection(context) {
  try {
    if (!context.botDb) {
      const botDb = await open({
        filename: './db/bot.db',
        driver: sqlite3.Database,
      })
      context.botDb = botDb
    }
    if (!context.messageDb) {
      const messageDb = await open({
        filename: process.env.MESSAGE_DB_PATH,
        driver: sqlite3.Database,
      })
      context.messageDb = messageDb
    }
  } catch (error) {
    console.log(
      new Date(),
      'エラー：このボットが使うデータベースに接続できませんでした。'
    )
    console.log(error)
    throw error
  }
  return context
}

const messageQuerySql = `
select m.rowid,
  m.guid,
  m.text,
  m.handle_id,
  m.subject,
  m.date,
  datetime(m.date/1000000000 + strftime('%s','2001-01-01'), 'unixepoch', 'localtime') as date_jst
from message m
  inner join handle h on m.handle_id = h.rowid
where h.id = ?
  and m.is_from_me = 0
order by m.date desc
limit 10;
`

const insertMessageSql = `
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

const countSentSql = `select count(*) as num from sent_message where guid = :guid`

const insertSentSql = `
insert into sent_message (guid, date) values (:guid, :date)
`

async function syncMessage(context) {
  console.log(new Date(), '[INFO] sync message')
  try {
    const result = await context.messageDb.all(
      messageQuerySql,
      process.env.MONITORED_PHONE_NUMBER
    )
    result.forEach(async (row) => {
      processMessage(context, row)
    })
  } catch (error) {
    console.log(
      new Date(),
      'エラー：メッセージDBとボットDBを同期できませんでした。'
    )
    console.log(error)
    throw error
  }
  return context
}

async function processMessage(context, row) {
  const insertResult = await context.botDb.run(insertMessageSql, {
    ':guid': row.guid,
    ':text': row.text,
    ':handle_id': row.handle_id,
    ':subject': row.subject,
    ':date': row.date,
  })
  if (insertResult.lastID) {
    const checkSentResult = await context.botDb.get(countSentSql, {
      ':guid': row.guid,
    })
    if (checkSentResult.num == 0) {
      console.log(new Date(), `[INFO] sending message ${row.text} to #general`)
      await app.client.chat.postMessage({
        token: context.botToken,
        channel: process.env.SLACK_CHANNEL,
        text: `お父さんがメッセージ経由で曰く、${row.text}`,
      })
      await context.botDb.run(insertSentSql, {
        ':guid': row.guid,
        ':date': row.date,
      })
    }
  }
}

function syncProcessLoop(_app) {
  app = _app
  return async ({ payload, context, next }) => {
    if (!syncStarted) {
      syncStarted = true
      setInterval(async () => {
        console.log(new Date(), `[INFO] sync going...`)
        await dbConnection(context)
        await syncMessage(context)
        // await context.botDb.close()
        // await context.messageDb.close()
      }, 5000)
    }
    await next()
  }
}

module.exports = {
  syncProcessLoop,
}
