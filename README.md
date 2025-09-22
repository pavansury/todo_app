# Flask To-Do App (Enhanced)

A simple, fast, and user-friendly To-Do application built with Flask, now enhanced with:

- Task categories (Work, Personal, Study)
- Priority levels (Low, Medium, High)
- Search and filter options
- Edit / delete actions
- Per-user task lists with authentication
- Modern UI with Bootstrap 5, responsive layout
- Dark mode toggle
- Smooth animations (GSAP)
- Toast notifications (Bootstrap Toasts)
- Progress tracking bar

## Quick start

1. Create a virtual environment and install requirements:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Run the app:

```bash
export FLASK_APP=app.py
python app.py
```

3. Open http://127.0.0.1:5000

## Notes
- Uses SQLite database (`database.db`). Tables are created on first run.
- A small SQLite migration helper adds `category` and `priority` columns if missing.
- Passwords are hashed with Werkzeug; consider using Flask-WTF for CSRF/forms if you extend this.
- For production, set a strong `SECRET_KEY` via environment variable.
