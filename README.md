# MediaHub — Social Media Command Center

A professional, full-stack social media management dashboard: connect multi-channel accounts, compose updates with live previews and character counters, schedule posts with presets, and manage your published feed — all in one unified, modern interface.

## ✨ Features

- **Sleek SaaS Design System**: Linear/Vercel-inspired UI with dark & light theme modes, glassmorphism, responsive 2-column workspace, and micro-interactions.
- **KPI Summary Metrics**: Real-time counters for connected channels, drafts, scheduled queue, and published posts.
- **Multi-Platform Channel Management**: Connect and manage Twitter/X, Instagram, Facebook, LinkedIn, and YouTube accounts with branded badges.
- **Post Studio & Live Interactive Preview**:
  - Live social card preview adapting dynamically to the selected platform.
  - Platform-specific character counter & limit indicators.
  - Quick hashtag insertion chips (`#launch`, `#growth`, `#tech`, etc.).
  - Smart scheduling presets (*Save as Draft*, *+1 Hour*, *Tomorrow 9 AM*, *Custom DateTime*).
- **Post Management & Feed**:
  - Filter tabs (*All*, *Drafts*, *Scheduled*, *Published*) with dynamic count badges.
  - Real-time search by keywords, usernames, or platforms (`Ctrl+K` shortcut).
  - 1-click instant publishing & safe confirmation deletion.
- **Non-blocking Toast Notifications & Modal Dialogs**: Sleek toast alerts replacing browser `alert()` and modal confirmation for safe deletion.
- **Sandbox Fallback Mode**: Works seamlessly with the Flask SQLite API, and automatically provides an interactive demo sandbox if opened statically without the backend running.

## 🛠️ Stack

- **Backend:** Python (Flask, Flask-CORS) + SQLite
- **Frontend:** Modern Semantic HTML5, CSS3 Variables, ES6+ JavaScript (Zero external build dependencies)

## 🚀 Getting Started

### 1. Backend Setup

```bash
pip install -r requirements.txt
python app.py
```

This starts the API server on `http://localhost:5000` and creates `mediahub.db` (SQLite) automatically on first run.

### 2. Frontend Launch

Open `index.html` directly in your browser, or start a lightweight HTTP server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## 📡 API Endpoints

| Method | Path                        | Description                              |
|--------|-----------------------------|------------------------------------------|
| `GET`    | `/api/accounts`             | List all connected accounts              |
| `POST`   | `/api/accounts`             | Connect a new account                    |
| `DELETE` | `/api/accounts/<id>`        | Remove an account and its posts          |
| `GET`    | `/api/posts?status=`        | List posts (optional filter by status)   |
| `POST`   | `/api/posts`                | Create a post (draft or scheduled)       |
| `PUT`    | `/api/posts/<id>`           | Update post content or schedule          |
| `DELETE` | `/api/posts/<id>`           | Delete a post                            |
| `POST`   | `/api/posts/<id>/publish`   | Mark a post as published (mock)          |
| `GET`    | `/api/summary`              | Real-time counts across dashboard        |

# MediaHub — Social Media Command Center

[![Live Demo](https://img.shields.io/badge/demo-online-brightgreen)](https://souryya2017-create.github.io/Media-hub/)

🌐 **Live Dashboard Preview:** https://souryya2017-create.github.io/Media-hub/
