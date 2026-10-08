DROP TABLE IF EXISTS antrian;

CREATE TABLE antrian (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pax INTEGER NOT NULL DEFAULT 1,
    area TEXT NOT NULL,
    notes TEXT,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting',
    destination TEXT,
    calledAt TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
