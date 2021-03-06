CREATE TABLE IF NOT EXISTS message (
  ROWID INTEGER PRIMARY KEY AUTOINCREMENT,
  guid TEXT UNIQUE NOT NULL,
  text TEXT,
  handle_id INTEGER DEFAULT 0,
  subject TEXT,
  date INTEGER
);
CREATE INDEX IF NOT EXISTS message_idx_guid ON message(guid);
CREATE INDEX IF NOT EXISTS message_idx_handle ON message(handle_id);
CREATE INDEX IF NOT EXISTS message_idx_date ON message(date);

CREATE TABLE IF NOT EXISTS sent_message (
  ROWID INTEGER PRIMARY KEY AUTOINCREMENT,
  guid TEXT UNIQUE NOT NULL,
  date INTEGER
);
CREATE INDEX IF NOT EXISTS sent_message_idx_guid ON sent_message(guid);
CREATE INDEX IF NOT EXISTS sent_message_idx_date ON sent_message(date);
