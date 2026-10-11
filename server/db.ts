import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(path.join(DATA_DIR, "bluelock.db"));

db.exec(`
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  coins INTEGER NOT NULL DEFAULT 0 CHECK (coins >= 0),
  gems INTEGER NOT NULL DEFAULT 0 CHECK (gems >= 0),
  shards INTEGER NOT NULL DEFAULT 0 CHECK (shards >= 0),
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  rating INTEGER NOT NULL DEFAULT 1000,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  goals INTEGER NOT NULL DEFAULT 0,
  win_streak INTEGER NOT NULL DEFAULT 0,
  story_stars INTEGER NOT NULL DEFAULT 0,
  flagged INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL CHECK (kind IN ('char','gear')),
  template_id TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('C','UC','R','E','M','L','WC','N1')),
  talent INTEGER NOT NULL CHECK (talent BETWEEN 0 AND 100),
  quality INTEGER NOT NULL CHECK (quality BETWEEN 0 AND 100),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  origin TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  locked_by TEXT,
  equipped_to INTEGER REFERENCES items(id) ON DELETE SET NULL,
  equip_slot TEXT,
  traits TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS items_owner ON items(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS items_equip_slot ON items(equipped_to, equip_slot) WHERE equipped_to IS NOT NULL;

-- Talent, quality, template, rarity and kind are fixed forever once rolled.
CREATE TRIGGER IF NOT EXISTS items_immutable_rolls
BEFORE UPDATE OF talent, quality, template_id, rarity, kind, created_at, origin ON items
WHEN OLD.talent IS NOT NEW.talent OR OLD.quality IS NOT NEW.quality
  OR OLD.template_id IS NOT NEW.template_id OR OLD.rarity IS NOT NEW.rarity
  OR OLD.kind IS NOT NEW.kind OR OLD.created_at IS NOT NEW.created_at OR OLD.origin IS NOT NEW.origin
BEGIN
  SELECT RAISE(ABORT, 'item rolls are immutable');
END;

CREATE TABLE IF NOT EXISTS item_rolls (
  item_id INTEGER PRIMARY KEY,
  template_id TEXT NOT NULL,
  rarity TEXT NOT NULL,
  talent INTEGER NOT NULL,
  quality INTEGER NOT NULL,
  first_owner INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TRIGGER IF NOT EXISTS items_record_roll AFTER INSERT ON items
BEGIN
  INSERT INTO item_rolls(item_id, template_id, rarity, talent, quality, first_owner, created_at)
  VALUES (NEW.id, NEW.template_id, NEW.rarity, NEW.talent, NEW.quality, NEW.owner_id, NEW.created_at);
END;
CREATE TRIGGER IF NOT EXISTS item_rolls_no_update BEFORE UPDATE ON item_rolls
BEGIN SELECT RAISE(ABORT, 'item_rolls is append-only'); END;
CREATE TRIGGER IF NOT EXISTS item_rolls_no_delete BEFORE DELETE ON item_rolls
BEGIN SELECT RAISE(ABORT, 'item_rolls is append-only'); END;

CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  d_coins INTEGER NOT NULL DEFAULT 0,
  d_gems INTEGER NOT NULL DEFAULT 0,
  d_shards INTEGER NOT NULL DEFAULT 0,
  item_id INTEGER,
  ref TEXT,
  meta TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ledger_user ON ledger(user_id, created_at);
CREATE TRIGGER IF NOT EXISTS ledger_no_update BEFORE UPDATE ON ledger
BEGIN SELECT RAISE(ABORT, 'ledger is append-only'); END;
CREATE TRIGGER IF NOT EXISTS ledger_no_delete BEFORE DELETE ON ledger
BEGIN SELECT RAISE(ABORT, 'ledger is append-only'); END;

CREATE TABLE IF NOT EXISTS pity (
  user_id INTEGER NOT NULL,
  banner_id TEXT NOT NULL,
  since_l INTEGER NOT NULL DEFAULT 0,
  since_n1 INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, banner_id)
);

CREATE TABLE IF NOT EXISTS idempotency (
  user_id INTEGER NOT NULL,
  key TEXT NOT NULL,
  route TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, key)
);

CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  formation TEXT NOT NULL,
  slots TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS story_progress (
  user_id INTEGER NOT NULL,
  stage_id TEXT NOT NULL,
  stars INTEGER NOT NULL,
  cleared_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, stage_id)
);

CREATE TABLE IF NOT EXISTS league_progress (
  user_id INTEGER NOT NULL,
  team_id TEXT NOT NULL,
  wins INTEGER NOT NULL DEFAULT 0,
  best_score TEXT,
  cleared_at INTEGER,
  PRIMARY KEY (user_id, team_id)
);

CREATE TABLE IF NOT EXISTS match_tickets (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  mode TEXT NOT NULL,
  ref TEXT NOT NULL,
  config TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quest_progress (
  user_id INTEGER NOT NULL,
  quest_id TEXT NOT NULL,
  period TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  claimed INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, quest_id, period)
);

CREATE TABLE IF NOT EXISTS daily_counters (
  user_id INTEGER NOT NULL,
  day TEXT NOT NULL,
  key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day, key)
);

CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY,
  seller_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  price INTEGER NOT NULL CHECK (price > 0),
  fee INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active','sold','cancelled')),
  buyer_id INTEGER,
  created_at INTEGER NOT NULL,
  closed_at INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS listings_active_item ON listings(item_id) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY,
  item_id INTEGER NOT NULL,
  template_id TEXT NOT NULL,
  rarity TEXT NOT NULL,
  talent INTEGER NOT NULL,
  quality INTEGER NOT NULL,
  price INTEGER NOT NULL,
  seller_id INTEGER NOT NULL,
  buyer_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sales_template ON sales(template_id, created_at);

CREATE TABLE IF NOT EXISTS trades (
  id INTEGER PRIMARY KEY,
  from_id INTEGER NOT NULL,
  to_id INTEGER NOT NULL,
  offer_items TEXT NOT NULL,
  offer_coins INTEGER NOT NULL CHECK (offer_coins >= 0),
  request_items TEXT NOT NULL,
  request_coins INTEGER NOT NULL CHECK (request_coins >= 0),
  status TEXT NOT NULL CHECK (status IN ('pending','accepted','declined','cancelled','failed')),
  created_at INTEGER NOT NULL,
  closed_at INTEGER
);

CREATE TABLE IF NOT EXISTS friends (
  user_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','accepted')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id INTEGER PRIMARY KEY,
  mode TEXT NOT NULL,
  user_a INTEGER,
  user_b INTEGER,
  score_a INTEGER NOT NULL,
  score_b INTEGER NOT NULL,
  meta TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS flags (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  meta TEXT,
  created_at INTEGER NOT NULL
);
`);

/** Lightweight migrations for existing local DBs. */
(() => {
  const cols = (db.prepare("PRAGMA table_info(items)").all() as { name: string }[]).map((c) => c.name);
  if (!cols.includes("traits")) {
    db.exec("ALTER TABLE items ADD COLUMN traits TEXT NOT NULL DEFAULT '[]'");
  }
  // Recreate immutability trigger to also lock traits.
  db.exec("DROP TRIGGER IF EXISTS items_immutable_rolls");
  db.exec(`
CREATE TRIGGER items_immutable_rolls
BEFORE UPDATE OF talent, quality, template_id, rarity, kind, created_at, origin, traits ON items
WHEN OLD.talent IS NOT NEW.talent OR OLD.quality IS NOT NEW.quality
  OR OLD.template_id IS NOT NEW.template_id OR OLD.rarity IS NOT NEW.rarity
  OR OLD.kind IS NOT NEW.kind OR OLD.created_at IS NOT NEW.created_at OR OLD.origin IS NOT NEW.origin
  OR OLD.traits IS NOT NEW.traits
BEGIN
  SELECT RAISE(ABORT, 'item rolls are immutable');
END;
`);
})();

/** Runs fn inside a single IMMEDIATE transaction; any throw rolls everything back. */
export function tx<T>(fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

type Param = string | number | bigint | null | Uint8Array;

export function get<T>(sql: string, ...params: Param[]): T | undefined {
  return db.prepare(sql).get(...params) as T | undefined;
}

export function all<T>(sql: string, ...params: Param[]): T[] {
  return db.prepare(sql).all(...params) as T[];
}

export function run(sql: string, ...params: Param[]) {
  return db.prepare(sql).run(...params);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
