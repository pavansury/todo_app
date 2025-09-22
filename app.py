from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from models import db, User, Task
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import text
import os
import sqlite3

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)
# Configure login view
setattr(login_manager, 'login_view', 'login')

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('tasks'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and check_password_hash(user.password, password):
            login_user(user)
            return redirect(url_for('tasks'))
        else:
            flash('Invalid credentials')
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username']
        email = request.form['email']
        password = request.form['password']

        if User.query.filter_by(username=username).first():
            flash('Username already exists')
            return redirect(url_for('register'))

        if User.query.filter_by(email=email).first():
            flash('Email already exists')
            return redirect(url_for('register'))

        hashed = generate_password_hash(password)
        new_user = User()
        new_user.username = username
        new_user.email = email
        new_user.password = hashed
        db.session.add(new_user)
        db.session.commit()

        flash('Registration successful. Please login.')
        return redirect(url_for('login'))

    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/tasks')
@login_required
def tasks():
    return render_template('tasks.html')

@app.route('/completed')
@login_required
def completed():
    return render_template('completed.html')

@app.route('/profile')
@login_required
def profile():
    return render_template('profile.html', user=current_user)

# Flask 3 removed before_first_request; initialization is done in __main__

@app.route('/api/tasks', methods=['GET'])
@login_required
def get_tasks():
    # Filters: q (search), category, priority
    q = request.args.get('q', type=str)
    category = request.args.get('category', type=str)
    priority = request.args.get('priority', type=str)
    query = Task.query.filter_by(user_id=current_user.id, completed=False)
    try:
        if q:
            like = f"%{q}%"
            query = query.filter((Task.title.ilike(like)) | (Task.description.ilike(like)))
        if category:
            query = query.filter(Task.category == category)
        if priority:
            query = query.filter(Task.priority == priority)
        tasks = query.order_by(Task.created_at.desc()).all()
    except Exception:
        _ensure_columns()
        # Retry once
        query = Task.query.filter_by(user_id=current_user.id, completed=False)
        if q:
            like = f"%{q}%"
            query = query.filter((Task.title.ilike(like)) | (Task.description.ilike(like)))
        if category:
            query = query.filter(Task.category == category)
        if priority:
            query = query.filter(Task.priority == priority)
        tasks = query.order_by(Task.created_at.desc()).all()
    return jsonify([task.to_dict() for task in tasks])

@app.route('/api/completed_tasks', methods=['GET'])
@login_required
def get_completed_tasks():
    q = request.args.get('q', type=str)
    category = request.args.get('category', type=str)
    priority = request.args.get('priority', type=str)
    query = Task.query.filter_by(user_id=current_user.id, completed=True)
    try:
        if q:
            like = f"%{q}%"
            query = query.filter((Task.title.ilike(like)) | (Task.description.ilike(like)))
        if category:
            query = query.filter(Task.category == category)
        if priority:
            query = query.filter(Task.priority == priority)
        tasks = query.order_by(Task.created_at.desc()).all()
    except Exception:
        _ensure_columns()
        query = Task.query.filter_by(user_id=current_user.id, completed=True)
        if q:
            like = f"%{q}%"
            query = query.filter((Task.title.ilike(like)) | (Task.description.ilike(like)))
        if category:
            query = query.filter(Task.category == category)
        if priority:
            query = query.filter(Task.priority == priority)
        tasks = query.order_by(Task.created_at.desc()).all()
    return jsonify([task.to_dict() for task in tasks])

@app.route('/api/tasks', methods=['POST'])
@login_required
def add_task():
    data = request.get_json()
    title = data.get('title')
    description = data.get('description', '')
    due_date_str = data.get('due_date')
    category = data.get('category') or 'Personal'
    priority = data.get('priority') or 'Medium'
    
    due_date = None
    if due_date_str:
        due_date = datetime.fromisoformat(due_date_str)
    
    new_task = Task()
    new_task.title = title
    new_task.description = description
    new_task.due_date = due_date
    new_task.user_id = current_user.id
    new_task.category = category
    new_task.priority = priority
    
    db.session.add(new_task)
    db.session.commit()
    
    return jsonify(new_task.to_dict()), 201

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
@login_required
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    
    if task.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    
    if 'title' in data:
        task.title = data['title']
    if 'description' in data:
        task.description = data['description']
    if 'completed' in data:
        task.completed = data['completed']
    if 'due_date' in data:
        due_date_str = data['due_date']
        task.due_date = datetime.fromisoformat(due_date_str) if due_date_str else None
    if 'category' in data:
        task.category = data['category'] or task.category
    if 'priority' in data:
        task.priority = data['priority'] or task.priority
    
    db.session.commit()
    
    return jsonify(task.to_dict())

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@login_required
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    
    if task.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    db.session.delete(task)
    db.session.commit()
    
    return jsonify({'message': 'Task deleted'})

@app.route('/api/stats', methods=['GET'])
@login_required
def stats():
    total = Task.query.filter_by(user_id=current_user.id).count()
    completed = Task.query.filter_by(user_id=current_user.id, completed=True).count()
    pending = total - completed
    pct = (completed / total * 100) if total else 0
    return jsonify({'total': total, 'completed': completed, 'pending': pending, 'percent': pct})

def _ensure_columns():
    # Simple SQLite migration: try to add columns; ignore if they already exist
    try:
        with db.engine.begin() as conn:
            try:
                conn.execute(text("ALTER TABLE task ADD COLUMN category TEXT DEFAULT 'Personal';"))
            except Exception:
                pass
            try:
                conn.execute(text("ALTER TABLE task ADD COLUMN priority TEXT DEFAULT 'Medium';"))
            except Exception:
                pass
    except Exception:
        pass

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        _ensure_columns()
    app.run(debug=True)