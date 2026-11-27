CREATE TABLE user_state (
 user_id TEXT PRIMARY KEY NOT NULL,
 revision INTEGER NOT NULL CHECK(revision >= 1),
 updated INTEGER NOT NULL,
 payload TEXT NOT NULL CHECK(length(payload) <= 16384)
);
