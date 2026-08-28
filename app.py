"""
MediaHub — Backend API
A lightweight Flask + SQLite backend for a social media management
platform: manage connected accounts, compose posts, schedule them,
and (mock-)publish them.

Run:
    pip install -r requirements.txt
    python app.py

Server starts on http://localhost:5000
"""

import sqlite3
import os
from datetime import datetime
from flask import Flask, g, jsonify, request
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "mediahub.db")

app = Flask(__name__)
CORS(app)  # allow the frontend (served separately) to call this API

VALID_PLATFORMS = {"Twitter/X", "Instagram", "Facebook", "LinkedIn", "YouTube"}
VALID_STATUSES = {"draft", "scheduled", "published"}


# ---------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            platform TEXT NOT NULL,
            username TEXT NOT NULL,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            scheduled_time TEXT,
            status TEXT NOT NULL DEFAULT 'draft',
            created_at TEXT NOT NULL,
            FOREIGN KEY (account_id) REFERENCES accounts (id) ON DELETE CASCADE
        );
        """
    )
    conn.commit()
    conn.close()


def row_to_dict(row):
    return {k: row[k] for k in row.keys()}


# ---------------------------------------------------------------------
# Accounts endpoints
# ---------------------------------------------------------------------

@app.route("/api/accounts", methods=["GET"])
def list_accounts():
    db = get_db()
    rows = db.execute("SELECT * FROM accounts ORDER BY created_at DESC").fetchall()
    return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/accounts", methods=["POST"])
def create_account():
    data = request.get_json(force=True) or {}
    platform = data.get("platform", "").strip()
    username = data.get("username", "").strip()

    if platform not in VALID_PLATFORMS:
        return jsonify({"error": f"platform must be one of {sorted(VALID_PLATFORMS)}"}), 400
    if not username:
        return jsonify({"error": "username is required"}), 400

    db = get_db()
    cur = db.execute(
        "INSERT INTO accounts (platform, username, created_at) VALUES (?, ?, ?)",
        (platform, username, datetime.utcnow().isoformat()),
    )
    db.commit()
    new_row = db.execute("SELECT * FROM accounts WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(row_to_dict(new_row)), 201


@app.route("/api/accounts/<int:account_id>", methods=["DELETE"])
def delete_account(account_id):
    db = get_db()
    db.execute("DELETE FROM accounts WHERE id = ?", (account_id,))
    db.commit()
    return "", 204


# ---------------------------------------------------------------------
# Posts endpoints
# ---------------------------------------------------------------------

@app.route("/api/posts", methods=["GET"])
def list_posts():
    db = get_db()
    status_filter = request.args.get("status")
    query = """
        SELECT posts.*, accounts.platform AS platform, accounts.username AS username
        FROM posts
        JOIN accounts ON posts.account_id = accounts.id
    """
    params = ()
    if status_filter:
        query += " WHERE posts.status = ?"
        params = (status_filter,)
    query += " ORDER BY COALESCE(posts.scheduled_time, posts.created_at) ASC"

    rows = db.execute(query, params).fetchall()
    return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/posts", methods=["POST"])
def create_post():
    data = request.get_json(force=True) or {}
    account_id = data.get("account_id")
    content = data.get("content", "").strip()
    scheduled_time = data.get("scheduled_time")  # ISO string or None
    status = data.get("status", "draft")

    if not account_id:
        return jsonify({"error": "account_id is required"}), 400
    if not content:
        return jsonify({"error": "content is required"}), 400
    if status not in VALID_STATUSES:
        return jsonify({"error": f"status must be one of {sorted(VALID_STATUSES)}"}), 400
    if status == "scheduled" and not scheduled_time:
        return jsonify({"error": "scheduled_time is required when status is 'scheduled'"}), 400

    db = get_db()
    account = db.execute("SELECT * FROM accounts WHERE id = ?", (account_id,)).fetchone()
    if not account:
        return jsonify({"error": "account not found"}), 404

    cur = db.execute(
        """INSERT INTO posts (account_id, content, scheduled_time, status, created_at)
           VALUES (?, ?, ?, ?, ?)""",
        (account_id, content, scheduled_time, status, datetime.utcnow().isoformat()),
    )
    db.commit()
    new_row = db.execute(
        """SELECT posts.*, accounts.platform AS platform, accounts.username AS username
           FROM posts JOIN accounts ON posts.account_id = accounts.id
           WHERE posts.id = ?""",
        (cur.lastrowid,),
    ).fetchone()
    return jsonify(row_to_dict(new_row)), 201


@app.route("/api/posts/<int:post_id>", methods=["PUT"])
def update_post(post_id):
    data = request.get_json(force=True) or {}
    db = get_db()
    post = db.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
    if not post:
        return jsonify({"error": "post not found"}), 404

    content = data.get("content", post["content"])
    scheduled_time = data.get("scheduled_time", post["scheduled_time"])
    status = data.get("status", post["status"])

    if status not in VALID_STATUSES:
        return jsonify({"error": f"status must be one of {sorted(VALID_STATUSES)}"}), 400

    db.execute(
        "UPDATE posts SET content = ?, scheduled_time = ?, status = ? WHERE id = ?",
        (content, scheduled_time, status, post_id),
    )
    db.commit()
    updated = db.execute(
        """SELECT posts.*, accounts.platform AS platform, accounts.username AS username
           FROM posts JOIN accounts ON posts.account_id = accounts.id
           WHERE posts.id = ?""",
        (post_id,),
    ).fetchone()
    return jsonify(row_to_dict(updated))


@app.route("/api/posts/<int:post_id>", methods=["DELETE"])
def delete_post(post_id):
    db = get_db()
    db.execute("DELETE FROM posts WHERE id = ?", (post_id,))
    db.commit()
    return "", 204


@app.route("/api/posts/<int:post_id>/publish", methods=["POST"])
def publish_post(post_id):
    """Mock-publish a post: in a real system this would call each
    platform's API (Twitter/X, Instagram, etc). Here it just flips
    the status so the frontend flow can be demoed end to end."""
    db = get_db()
    post = db.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
    if not post:
        return jsonify({"error": "post not found"}), 404

    db.execute("UPDATE posts SET status = 'published' WHERE id = ?", (post_id,))
    db.commit()
    updated = db.execute(
        """SELECT posts.*, accounts.platform AS platform, accounts.username AS username
           FROM posts JOIN accounts ON posts.account_id = accounts.id
           WHERE posts.id = ?""",
        (post_id,),
    ).fetchone()
    return jsonify(row_to_dict(updated))


# ---------------------------------------------------------------------
# Dashboard summary
# ---------------------------------------------------------------------

@app.route("/api/summary", methods=["GET"])
def summary():
    db = get_db()
    accounts_count = db.execute("SELECT COUNT(*) AS c FROM accounts").fetchone()["c"]
    counts = db.execute(
        "SELECT status, COUNT(*) AS c FROM posts GROUP BY status"
    ).fetchall()
    status_counts = {row["status"]: row["c"] for row in counts}
    return jsonify({
        "accounts": accounts_count,
        "draft": status_counts.get("draft", 0),
        "scheduled": status_counts.get("scheduled", 0),
        "published": status_counts.get("published", 0),
    })


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
