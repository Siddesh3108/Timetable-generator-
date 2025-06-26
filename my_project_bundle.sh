--- Generating a text bundle of the project... ---
# This is a self-extracting bash script.
# To unpack, run: bash <filename>
set -e
echo 'Unpacking project...'
mkdir -p extracted_project && cd extracted_project || exit

mkdir -p "backend"
mkdir -p "backend/app"
mkdir -p "backend/app/ai_engine"
mkdir -p "backend/app/api"
mkdir -p "backend/migrations"
mkdir -p "backend/migrations/versions"
mkdir -p "backend/tests"
mkdir -p "frontend"
mkdir -p "frontend/src"
mkdir -p "frontend/src/components"
mkdir -p "frontend/src/components/forms"
mkdir -p "frontend/src/context"
mkdir -p "frontend/src/pages"
mkdir -p "frontend/src/styles"

echo 'Creating .gitignore...'
cat <<'EOF' > ".gitignore"
# Python
__pycache__/
*.pyc
*.pyo
*.pyd
*.pyc
.env
.venv/
venv/
# Node
node_modules/
dist/
npm-debug.log
# Docker
data/
# IDE
.vscode/
.idea/
EOF

echo 'Creating backend/app/ai_engine/celery_tasks.py...'
cat <<'EOF' > "backend/app/ai_engine/celery_tasks.py"
import logging
from app import create_app
from ..extensions import celery
from ..models import Teacher, Room, Subject
from .genetic_algorithm import GeneticOptimizer
from .constraint_manager import ConstraintManager
from .nn_model import TimetableModel
logger = logging.getLogger(__name__)
def serialize_timetable(grid):
    """Converts a timetable with ORM objects into a simple, JSON-friendly dictionary."""
    serialized_grid = {}
    for day, slots in grid.items():
        serialized_grid[day] = {}
        for time, events in slots.items():
            serialized_grid[day][time] = [
                {
                    'id': event['id'],
                    'subject': {'name': event['subject'].name, 'code': event['subject'].code},
                    'teacher': {'name': event['teacher'].name},
                    'room': {'name': event['room'].name, 'room_type': event['room'].room_type},
                    'day': event['day'],
                    'time': event['time']
                } for event in events
            ]
    return serialized_grid
def run_ai_generation_logic(user_id, task_update_callback):
    task_update_callback('PROGRESS', {'status': 'Fetching latest data...', 'progress': 5})
    teachers = Teacher.query.filter_by(user_id=user_id).all()
    rooms = Room.query.filter_by(user_id=user_id).all()
    subjects = Subject.query.filter_by(user_id=user_id).all()
    if not all([teachers, rooms, subjects]):
        raise ValueError("Insufficient data. Please add at least one Teacher, Room, and Subject.")
    task_update_callback('PROGRESS', {'status': 'Initializing AI constraints...', 'progress': 15})
    cm = ConstraintManager(teachers, rooms, subjects)
    input_data = cm.get_feature_matrix()
    if input_data.size == 0:
        raise ValueError("Could not generate feature matrix from the data provided.")
    task_update_callback('PROGRESS', {'status': 'Building neural network...', 'progress': 25})
    model = TimetableModel(input_shape=input_data.shape, num_constraints=len(cm.get_constraint_types()))
    model.build(input_shape=(None, input_data.shape[1])); model.compile(optimizer='adam')
    task_update_callback('PROGRESS', {'status': 'Optimizing with Genetic Algorithm...', 'progress': 40})
    ga = GeneticOptimizer() # Use default faster params
    best_weights = ga.optimize(model, input_data, cm)
    model.set_weights(best_weights)
    task_update_callback('PROGRESS', {'status': 'Generating final timetable...', 'progress': 85})
    predictions = model(input_data)
    timetable_grid, raw_events = cm.decode_timetable(predictions.numpy())
    metrics = cm.evaluate_timetable(raw_events)
    serialized_grid = serialize_timetable(timetable_grid)
    return {'timetable': serialized_grid, 'metrics': metrics}
@celery.task(bind=True)
def generate_timetable_task(self, user_id):
    logger.info(f"Task {self.request.id} for user {user_id} received.")
    app = create_app()
    with app.app_context():
        try:
            def update_progress_callback(state, meta): self.update_state(state=state, meta=meta)
            result = run_ai_generation_logic(user_id, update_progress_callback)
            return result
        except Exception as e:
            logger.error(f"Celery task {self.request.id} failed: {str(e)}", exc_info=True)
            self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
            raise
EOF

echo 'Creating backend/app/ai_engine/constraint_manager.py...'
cat <<'EOF' > "backend/app/ai_engine/constraint_manager.py"
import numpy as np
from collections import defaultdict
class ConstraintManager:
    def __init__(self, teachers, rooms, subjects):
        self.teachers = {t.id: t for t in teachers}
        self.rooms = {r.id: r for r in rooms}
        self.subjects = {s.id: s for s in subjects}
        self.timeslots = list(range(9, 18))
        self.days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    def get_feature_matrix(self):
        num_features = len(self.teachers) + len(self.rooms) + len(self.subjects)
        return np.random.rand(len(self.subjects) * 5, num_features) if self.subjects else np.array([[]])
    def decode_timetable(self, nn_output):
        timetable_grid = {day: {str(time): [] for time in self.timeslots} for day in self.days}
        raw_events = []
        event_id_counter = 0
        for subject in self.subjects.values():
            placed = False
            for _ in range(50): # Increased attempts for better placement
                if placed: break
                day = np.random.choice(self.days)
                time = np.random.choice(self.timeslots)
                teacher = np.random.choice(list(self.teachers.values()))
                room = np.random.choice(list(self.rooms.values()))
                event = {
                    'id': str(event_id_counter), 'subject': subject,
                    'teacher': teacher, 'room': room,
                    'day': day, 'time': str(time)
                }
                if self.check_event_conflicts(event, timetable_grid) == 0:
                    timetable_grid[day][str(time)].append(event)
                    raw_events.append(event)
                    event_id_counter += 1
                    placed = True
                    break
        return timetable_grid, raw_events
    def check_event_conflicts(self, event_to_add, timetable_grid):
        conflicts = 0
        day, time = event_to_add['day'], event_to_add['time']
        for existing_event in timetable_grid[day][str(time)]:
            if existing_event['teacher'].id == event_to_add['teacher'].id: conflicts += 1
            if existing_event['room'].id == event_to_add['room'].id: conflicts += 1
        if event_to_add['subject'].requires_lab and event_to_add['room'].room_type != 'Lab':
            conflicts += 1
        teacher = event_to_add['teacher']
        if teacher.is_visiting and teacher.availability:
            avail = teacher.availability
            avail_days = avail.get('days', [])
            time_from = int(avail.get('from', '23:00').split(':')[0])
            time_to = int(avail.get('to', '00:00').split(':')[0])
            if not (day.lower() in avail_days and time_from <= int(time) < time_to):
                conflicts += 1
        return conflicts
    def evaluate_timetable(self, raw_events):
        total_conflicts = 0
        for i, event1 in enumerate(raw_events):
            for j, event2 in enumerate(raw_events):
                if i >= j: continue
                if event1['day'] == event2['day'] and event1['time'] == event2['time']:
                    if event1['teacher'].id == event2['teacher'].id: total_conflicts += 1
                    if event1['room'].id == event2['room'].id: total_conflicts += 1
        satisfaction = max(0, 100 - (total_conflicts * 20))
        return {'conflicts': total_conflicts, 'satisfaction': satisfaction}
    def get_constraint_types(self):
        return ['teacher_conflict', 'room_conflict', 'lab_mismatch', 'visiting_availability']
EOF

echo 'Creating backend/app/ai_engine/genetic_algorithm.py...'
cat <<'EOF' > "backend/app/ai_engine/genetic_algorithm.py"
import numpy as np
import logging
import tensorflow as tf
logger = logging.getLogger(__name__)
class GeneticOptimizer:
    def __init__(self, pop_size=50, generations=30):
        self.pop_size = pop_size
        self.generations = generations
    def optimize(self, model, input_data, constraint_manager):
        population = [model.get_weights() for _ in range(self.pop_size)]
        for gen in range(self.generations):
            fitness_scores = [self.fitness_function(model, w, input_data, constraint_manager) for w in population]
            elite_count = max(2, int(self.pop_size * 0.1))
            elite_indices = np.argsort(fitness_scores)[-elite_count:]
            new_population = [population[i] for i in elite_indices]
            while len(new_population) < self.pop_size:
                parent1_idx = self._tournament_selection(fitness_scores)
                parent2_idx = self._tournament_selection(fitness_scores)
                child = self._crossover(population[parent1_idx], population[parent2_idx])
                child = self._mutate(child)
                new_population.append(child)
            population = new_population
            if (gen + 1) % 5 == 0 or gen == 0:
                logger.info(f"GA Generation {gen+1}/{self.generations}: Best fitness = {max(fitness_scores):.4f}")
        best_idx = np.argmax([self.fitness_function(model, w, input_data, constraint_manager) for w in population])
        return population[best_idx]
    def _tournament_selection(self, fitness_scores, tournament_size=3):
        candidates_idx = np.random.choice(len(fitness_scores), tournament_size, replace=False)
        best_candidate_local_idx = np.argmax([fitness_scores[i] for i in candidates_idx])
        return candidates_idx[best_candidate_local_idx]
    def fitness_function(self, model, weights, input_data, constraint_manager):
        model.set_weights(weights)
        predictions = model(input_data)
        timetable_grid, raw_events = constraint_manager.decode_timetable(predictions.numpy())
        metrics = constraint_manager.evaluate_timetable(raw_events)
        fitness = 100 - (metrics.get('conflicts', 100) * 10)
        return fitness
    def _crossover(self, w1, w2, rate=0.8):
        child = []
        for i in range(len(w1)):
            if np.random.rand() < rate:
                child.append((w1[i] + w2[i]) / 2)
            else:
                child.append(w1[i] if np.random.rand() < 0.5 else w2[i])
        return child
    def _mutate(self, weights, rate=0.05, magnitude=0.1):
        mutated_weights = []
        for w in weights:
            if np.random.rand() < rate:
                mutation = np.random.normal(0, magnitude, w.shape)
                mutated_weights.append(w + mutation.astype(w.dtype))
            else:
                mutated_weights.append(w)
        return mutated_weights
EOF

echo 'Creating backend/app/ai_engine/nn_model.py...'
cat <<'EOF' > "backend/app/ai_engine/nn_model.py"
import tensorflow as tf
class TimetableModel(tf.keras.Model):
    def __init__(self, input_shape, num_constraints):
        super().__init__()
        self.encoder = tf.keras.Sequential([
            tf.keras.layers.Dense(256, activation='relu', input_shape=(input_shape[1],)),
            tf.keras.layers.BatchNormalization(),
            tf.keras.layers.Dense(128, activation='relu'),
            tf.keras.layers.Dropout(0.2)
        ])
        self.constraint_branches = [
            tf.keras.Sequential([
                tf.keras.layers.Dense(64, activation='relu'),
                tf.keras.layers.Dense(32, activation='relu')
            ]) for _ in range(num_constraints)
        ]
        self.decoder = tf.keras.Sequential([
            tf.keras.layers.Dense(128, activation='relu'),
            tf.keras.layers.Dense(64, activation='relu'),
            tf.keras.layers.Dense(input_shape[1], activation='sigmoid')
        ])
    def call(self, inputs):
        encoded = self.encoder(inputs)
        encoded = tf.clip_by_value(encoded, -10, 10)
        constraint_outputs = []
        for branch in self.constraint_branches:
            output = branch(encoded)
            output = tf.clip_by_value(output, -5, 5)
            constraint_outputs.append(output)
        merged = tf.concat(constraint_outputs, axis=-1)
        output = self.decoder(merged)
        return tf.clip_by_value(output, 1e-7, 1 - 1e-7)
    def compute_loss(self, predictions, targets):
        reconstruction_loss = tf.reduce_mean(
            tf.keras.losses.binary_crossentropy(targets, predictions)
        )
        constraint_loss = 0
        for branch in self.constraint_branches:
            for layer in branch.layers:
                if hasattr(layer, 'kernel'):
                    constraint_loss += tf.reduce_sum(tf.abs(layer.kernel))
        return reconstruction_loss + 0.01 * constraint_loss
EOF

echo 'Creating backend/app/api/routes.py...'
cat <<'EOF' > "backend/app/api/routes.py"
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from ..extensions import db, celery
from ..models import Teacher, Room, Subject
api_bp = Blueprint('api', __name__)
@api_bp.route('/dashboard-summary')
@login_required
def dashboard_summary():
    return jsonify({
        'totalTeachers': Teacher.query.filter_by(user_id=current_user.id).count(),
        'totalRooms': Room.query.filter_by(user_id=current_user.id).count(),
        'totalSubjects': Subject.query.filter_by(user_id=current_user.id).count()
    })
@api_bp.route('/teachers', methods=['POST'])
@login_required
def handle_teachers(): data = request.get_json(); new_item = Teacher(user_id=current_user.id, **data); db.session.add(new_item); db.session.commit(); return jsonify({'id': new_item.id}), 201
@api_bp.route('/rooms', methods=['POST'])
@login_required
def handle_rooms(): data = request.get_json(); new_item = Room(user_id=current_user.id, **data); db.session.add(new_item); db.session.commit(); return jsonify({'id': new_item.id}), 201
@api_bp.route('/subjects', methods=['POST'])
@login_required
def handle_subjects(): data = request.get_json(); new_item = Subject(user_id=current_user.id, **data); db.session.add(new_item); db.session.commit(); return jsonify({'id': new_item.id}), 201
@api_bp.route('/generate', methods=['POST'])
@login_required
def generate_timetable():
    from ..ai_engine.celery_tasks import generate_timetable_task
    task = generate_timetable_task.delay(user_id=current_user.id)
    return jsonify({"message": "Generation started!", "taskId": task.id}), 202
@api_bp.route('/task/<task_id>', methods=['GET'])
@login_required
def get_task_status(task_id):
    from ..ai_engine.celery_tasks import generate_timetable_task
    task = generate_timetable_task.AsyncResult(task_id)
    response = {'state': task.state}
    if task.state == 'PENDING':
        response['status'] = 'Task is in the queue...'
    elif task.state == 'PROGRESS':
        response.update(task.info)
    elif task.state == 'SUCCESS':
        response['result'] = task.result
    elif task.state == 'FAILURE':
        response['error'] = str(task.info) if task.info else 'Task failed with no specific error.'
    return jsonify(response)
EOF

echo 'Creating backend/app/auth_routes.py...'
cat <<'EOF' > "backend/app/auth_routes.py"
from flask import Blueprint, request, jsonify
from .extensions import db, bcrypt
from .models import User
from flask_login import login_user, logout_user, login_required, current_user
auth_bp = Blueprint('auth_routes', __name__)
@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing email or password'}), 400
    user_exists = User.query.filter_by(email=data.get('email')).first()
    if user_exists:
        return jsonify({'error': 'Email address already registered'}), 409
    username = data.get('username', data.get('email').split('@')[0])
    new_user = User(username=username, email=data.get('email'))
    new_user.set_password(data.get('password'))
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': f"User {new_user.username} created successfully"}), 201
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing email or password'}), 400
    user = User.query.filter_by(email=data.get('email')).first()
    if user and user.check_password(data.get('password')):
        login_user(user, remember=True)
        return jsonify({'status': 'success', 'user': {'username': user.username, 'email': user.email}}), 200
    return jsonify({'error': 'Invalid email or password'}), 401
@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'status': 'success', 'message': 'You have been logged out.'}), 200
@auth_bp.route('/session')
@login_required
def session():
    return jsonify({
        'status': 'success',
        'user': {
            'username': current_user.username,
            'email': current_user.email
        }
    }), 200
EOF

echo 'Creating backend/app/config.py...'
cat <<'EOF' > "backend/app/config.py"
import os
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'a-very-secret-key-that-you-should-change')
    SQLALCHEMY_DATABASE_URI = 'postgresql://user:password@db/timetable_db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CELERY_BROKER_URL = 'redis://redis:6379/0'
    CELERY_RESULT_BACKEND = 'redis://redis:6379/0'
EOF

echo 'Creating backend/app/extensions.py...'
cat <<'EOF' > "backend/app/extensions.py"
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from flask_login import LoginManager
from celery import Celery
db = SQLAlchemy()
migrate = Migrate()
bcrypt = Bcrypt()
login_manager = LoginManager()
celery = Celery()
@login_manager.user_loader
def load_user(user_id):
    from .models import User
    return User.query.get(int(user_id))
EOF

echo 'Creating backend/app/models.py...'
cat <<'EOF' > "backend/app/models.py"
from .extensions import db, bcrypt
from flask_login import UserMixin
from sqlalchemy.dialects.postgresql import JSONB
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    def set_password(self, password): self.password_hash = bcrypt.generate_password_hash(password).decode('utf8')
    def check_password(self, password): return bcrypt.check_password_hash(self.password_hash, password)
class Teacher(db.Model):
    __tablename__ = 'teachers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    subject_taught = db.Column(db.String(255))
    classes_taught = db.Column(db.String(255))
    max_lectures_per_day = db.Column(db.Integer)
    lecture_type = db.Column(db.String(50))
    theory_hours_per_week = db.Column(db.Integer)
    lab_hours_per_week = db.Column(db.Integer)
    is_visiting = db.Column(db.Boolean, default=False)
    availability = db.Column(JSONB)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('teachers', lazy=True, cascade="all, delete-orphan"))
class Room(db.Model):
    __tablename__ = 'rooms'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    room_type = db.Column(db.String(50))
    capacity = db.Column(db.Integer)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('rooms', lazy=True, cascade="all, delete-orphan"))
class Subject(db.Model):
    __tablename__ = 'subjects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), nullable=False)
    requires_lab = db.Column(db.Boolean, default=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('subjects', lazy=True, cascade="all, delete-orphan"))
EOF

echo 'Creating backend/app/__init__.py...'
cat <<'EOF' > "backend/app/__init__.py"
from flask import Flask
from .config import Config
from .extensions import db, migrate, bcrypt, login_manager, celery
from flask_cors import CORS
def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    db.init_app(app); migrate.init_app(app, db); bcrypt.init_app(app); login_manager.init_app(app)
    CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://localhost"])
    celery.config_from_object(app.config, namespace='CELERY')
    celery.autodiscover_tasks(['app.ai_engine'])
    app.extensions["celery"] = celery
    from .api.routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    from .auth_routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')
    return app
EOF

echo 'Creating backend/celery_app.py...'
cat <<'EOF' > "backend/celery_app.py"
from app import create_app
flask_app = create_app()
celery_app = flask_app.extensions["celery"]
EOF

echo 'Creating backend/celery_worker.py...'
cat <<'EOF' > "backend/celery_worker.py"
# THIS IS THE CRITICAL FIX.
# By importing the celery_tasks module here, we ensure that the
# @celery.task decorator is run, and the task is registered with the
# Celery application when the worker starts. This solves the
# 'task not found' error.
from app import create_app
from app.ai_engine import celery_tasks

app = create_app()
celery_app = app.extensions["celery"]
EOF

echo 'Creating backend/Dockerfile...'
cat <<'EOF' > "backend/Dockerfile"
FROM python:3.9-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV FLASK_APP="app:create_app()"
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc build-essential libpq-dev && \
    rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "app:create_app()", "--bind", "0.0.0.0:5000", "--workers", "3", "--timeout", "300"]
EOF

echo 'Creating backend/migrations/alembic.ini...'
cat <<'EOF' > "backend/migrations/alembic.ini"
[alembic]
[loggers]
keys = root,sqlalchemy,alembic,flask_migrate
[handlers]
keys = console
[formatters]
keys = generic
[logger_root]
level = WARN
handlers = console
qualname =
[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine
[logger_alembic]
level = INFO
handlers =
qualname = alembic
[logger_flask_migrate]
level = INFO
handlers =
qualname = flask_migrate
[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic
[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
EOF

echo 'Creating backend/migrations/env.py...'
cat <<'EOF' > "backend/migrations/env.py"
import logging
from logging.config import fileConfig
from flask import current_app
from alembic import context
config = context.config
fileConfig(config.config_file_name)
logger = logging.getLogger('alembic.env')
def get_engine():
    try:
        return current_app.extensions['migrate'].db.get_engine()
    except (TypeError, AttributeError):
        return current_app.extensions['migrate'].db.engine
def get_engine_url():
    try:
        return get_engine().url.render_as_string(hide_password=False).replace(
            '%', '%%')
    except AttributeError:
        return str(get_engine().url).replace('%', '%%')
config.set_main_option('sqlalchemy.url', get_engine_url())
target_db = current_app.extensions['migrate'].db
def get_metadata():
    if hasattr(target_db, 'metadatas'):
        return target_db.metadatas[None]
    return target_db.metadata
def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url, target_metadata=get_metadata(), literal_binds=True
    )
    with context.begin_transaction():
        context.run_migrations()
def run_migrations_online():
    def process_revision_directives(context, revision, directives):
        if getattr(config.cmd_opts, 'autogenerate', False):
            script = directives[0]
            if script.upgrade_ops.is_empty():
                directives[:] = []
                logger.info('No changes in schema detected.')
    conf_args = current_app.extensions['migrate'].configure_args
    if conf_args.get("process_revision_directives") is None:
        conf_args["process_revision_directives"] = process_revision_directives
    connectable = get_engine()
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=get_metadata(),
            **conf_args
        )
        with context.begin_transaction():
            context.run_migrations()
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
EOF

echo 'Creating backend/migrations/README...'
cat <<'EOF' > "backend/migrations/README"
Single-database configuration for Flask.
EOF

echo 'Creating backend/migrations/script.py.mako...'
cat <<'EOF' > "backend/migrations/script.py.mako"
"""${message}
Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}
"""
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}
revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}
def upgrade():
    ${upgrades if upgrades else "pass"}
def downgrade():
    ${downgrades if downgrades else "pass"}
EOF

echo 'Creating backend/migrations/versions/dabeedf698eb_final_working_models.py...'
cat <<'EOF' > "backend/migrations/versions/dabeedf698eb_final_working_models.py"
"""Final working models
Revision ID: dabeedf698eb
Revises:
Create Date: 2025-06-24 12:01:47.327301
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
revision = 'dabeedf698eb'
down_revision = None
branch_labels = None
depends_on = None
def upgrade():
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('username', sa.String(length=80), nullable=False),
    sa.Column('email', sa.String(length=120), nullable=False),
    sa.Column('password_hash', sa.String(length=128), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email')
    )
    op.create_table('rooms',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=50), nullable=False),
    sa.Column('room_type', sa.String(length=50), nullable=True),
    sa.Column('capacity', sa.Integer(), nullable=True),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('subjects',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('code', sa.String(length=20), nullable=False),
    sa.Column('requires_lab', sa.Boolean(), nullable=True),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('teachers',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('subject_taught', sa.String(length=255), nullable=True),
    sa.Column('classes_taught', sa.String(length=255), nullable=True),
    sa.Column('max_lectures_per_day', sa.Integer(), nullable=True),
    sa.Column('lecture_type', sa.String(length=50), nullable=True),
    sa.Column('theory_hours_per_week', sa.Integer(), nullable=True),
    sa.Column('lab_hours_per_week', sa.Integer(), nullable=True),
    sa.Column('is_visiting', sa.Boolean(), nullable=True),
    sa.Column('availability', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
def downgrade():
    op.drop_table('teachers')
    op.drop_table('subjects')
    op.drop_table('rooms')
    op.drop_table('users')
EOF

echo 'Creating backend/requirements.txt...'
cat <<'EOF' > "backend/requirements.txt"
flask==3.0.0
flask-cors==4.0.0
flask-sqlalchemy==3.0.5
flask-limiter==3.3.0
celery==5.3.1
redis==4.5.5
tensorflow==2.13.0
numpy==1.24.3
pandas==2.0.3
gunicorn==21.2.0
psycopg2-binary==2.9.7
python-dotenv==1.0.0
networkx==3.1
Flask-Migrate
Flask-Bcrypt
Flask-Login
EOF

echo 'Creating backend/tests/test_ai_engine.py...'
cat <<'EOF' > "backend/tests/test_ai_engine.py"
import pytest
import numpy as np
from app.ai_engine import generate_timetable
from app.ai_engine.constraint_manager import ConstraintManager
from app.ai_engine.genetic_algorithm import GeneticOptimizer
from app.ai_engine.nn_model import TimetableModel
from app.models import Constraint
@pytest.fixture
def sample_constraints():
    return [
        {'teacher_id': 'T1','course_id': 'C1','room_id': 'R1','class_id': 'Class1','timeslot': 1,'room_type': 'classroom','max_hours': 20,'max_consecutive': 3,'is_visiting': False,'availability': []},
        {'teacher_id': 'T2','course_id': 'C2','room_id': 'R2','class_id': 'Class2','timeslot': 2,'room_type': 'lab','max_hours': 15,'max_consecutive': 2,'is_visiting': True,'availability': [1, 2, 3]}
    ]
def test_constraint_manager_initialization(sample_constraints):
    cm = ConstraintManager(sample_constraints)
    assert len(cm.teachers) == 2
    assert len(cm.courses) == 2
    assert len(cm.rooms) == 2
    assert len(cm.classes) == 2
    assert cm.teacher_metadata['T1']['max_hours'] == 20
    assert cm.teacher_metadata['T2']['is_visiting'] is True
def test_constraint_manager_conflict_detection(sample_constraints):
    cm = ConstraintManager(sample_constraints)
    timetable = {'monday': {1: {'teacher_id': 'T1','course_id': 'C1','room_id': 'R1','class_id': 'Class1','room_type': 'classroom'},2: {'teacher_id': 'T1','course_id': 'C2','room_id': 'R2','class_id': 'Class2','room_type': 'lab'}}}
    conflicts = cm.count_conflicts(timetable)
    assert conflicts['teacher'] == 1
def test_genetic_optimizer():
    model = TimetableModel(input_shape=(10, 50), num_constraints=7)
    ga = GeneticOptimizer(pop_size=10)
    input_data = np.random.rand(10, 50)
    cm = ConstraintManager([])
    weights = ga.optimize(model, input_data, cm, generations=2)
    assert len(weights) == len(model.get_weights())
def test_nn_model_forward_pass():
    model = TimetableModel(input_shape=(10, 50), num_constraints=7)
    input_data = np.random.rand(1, 50)
    output = model(input_data)
    assert output.shape == (1, 50)
def test_generate_timetable_integration(sample_constraints):
    timetable, metrics = generate_timetable(sample_constraints)
    assert isinstance(timetable, dict)
    assert 'monday' in timetable
    assert isinstance(metrics, dict)
    assert 'conflicts' in metrics
    assert 'satisfaction' in metrics
def test_visiting_faculty_constraint():
    constraints = [{'teacher_id': 'VT1','course_id': 'C1','room_id': 'R1','class_id': 'Class1','timeslot': 1,'room_type': 'classroom','max_hours': 10,'max_consecutive': 2,'is_visiting': True,'availability': [1, 2]}]
    cm = ConstraintManager(constraints)
    timetable = {'monday': {3: {'teacher_id': 'VT1','course_id': 'C1','room_id': 'R1','class_id': 'Class1','room_type': 'classroom'}}}
    conflicts = cm.count_conflicts(timetable)
    assert conflicts['visiting'] == 1
def test_room_type_constraint():
    constraints = [{'teacher_id': 'T1','course_id': 'Lab1','room_id': 'R1','class_id': 'Class1','timeslot': 1,'room_type': 'lab','max_hours': 20,'max_consecutive': 3,'is_visiting': False,'availability': []}]
    cm = ConstraintManager(constraints)
    timetable = {'monday': {1: {'teacher_id': 'T1','course_id': 'Lab1','room_id': 'R1','class_id': 'Class1','room_type': 'classroom'}}}
    conflicts = cm.count_conflicts(timetable)
    assert conflicts['room_type'] == 1
EOF

echo 'Creating docker-compose.yml...'
cat <<'EOF' > "docker-compose.yml"
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: timetable-backend
    ports:
      - "5000:5000"
    environment:
      - FLASK_APP=app:create_app()
    volumes:
      - ./backend:/app
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
  celery:
    build:
      context: ./backend
    command: celery -A celery_worker.celery_app worker --loglevel=info
    container_name: timetable-celery
    volumes:
      - ./backend:/app
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
  frontend:
    build:
      context: ./frontend
    container_name: timetable-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
  db:
    image: postgres:14
    container_name: timetable-db
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: timetable_db
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      # AFTER (The correct version)
      test: ["CMD-SHELL", "pg_isready -U user -d timetable_db"]
      interval: 10s
      timeout: 5s
      retries: 5
  redis:
    image: redis:7
    container_name: timetable-redis
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
volumes:
  postgres-data: {}
EOF

echo 'Creating frontend/Dockerfile...'
cat <<'EOF' > "frontend/Dockerfile"
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

echo 'Creating frontend/index.html...'
cat <<'EOF' > "frontend/index.html"
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Timetable Generator</title></head>
<body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>
</html>
EOF

echo 'Creating frontend/nginx.conf...'
cat <<'EOF' > "frontend/nginx.conf"
server {
    listen 80;
    server_name localhost;
    location / {
        root   /usr/share/nginx/html;
        index  index.html;
        try_files $uri $uri/ /index.html;
    }
    location ~ ^/(api|auth)/ {
        proxy_pass http://backend:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    error_page   500 502 503 504  /50x.html;
    location = /50x.html {
        root   /usr/share/nginx/html;
    }
}
EOF

echo 'Creating frontend/package.json...'
cat <<'EOF' > "frontend/package.json"
{ "name": "timetable-frontend", "private": true, "version": "0.0.0", "type": "module",
  "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview" },
  "dependencies": { "axios": "^1.6.8", "react": "^18.2.0", "react-beautiful-dnd": "^13.1.1", "react-dom": "^18.2.0", "react-router-dom": "^6.22.3" },
  "devDependencies": { "@vitejs/plugin-react": "^4.2.1", "autoprefixer": "^10.4.19", "postcss": "^8.4.38", "tailwindcss": "^3.4.3", "vite": "^5.2.0" }
}
EOF

echo 'Creating frontend/postcss.config.js...'
cat <<'EOF' > "frontend/postcss.config.js"
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

echo 'Creating frontend/src/api.js...'
cat <<'EOF' > "frontend/src/api.js"
import axios from 'axios'; const apiClient = axios.create({ baseURL: '/', withCredentials: true }); export default apiClient;
EOF

echo 'Creating frontend/src/App.jsx...'
cat <<'EOF' > "frontend/src/App.jsx"
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import DataEntry from './pages/DataEntry';
import Timetable from './pages/Timetable';
import Generate from './pages/Generate';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Loader from './components/Loader';
const ProtectedRoute = ({ children }) => {
    const { user } = useAuth();
    return user ? children : <Navigate to="/login" replace />;
};
function App() {
  const { user, loading } = useAuth();
  if (loading) return <Loader statusMessage="Loading..." />;
  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />
      <main className="pt-24 container mx-auto px-6">
        <Routes>
          <Route path="/" element={!user ? <LoginPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/data-entry" element={<ProtectedRoute><DataEntry /></ProtectedRoute>} />
          <Route path="/timetable" element={<ProtectedRoute><Timetable /></ProtectedRoute>} />
          <Route path="/generate" element={<ProtectedRoute><Generate /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
export default App;
EOF

echo 'Creating frontend/src/components/forms/RoomForm.jsx...'
cat <<'EOF' > "frontend/src/components/forms/RoomForm.jsx"
import React, { useState } from 'react'; import apiClient from '../../api'; export default function RoomForm() { const [formData, setFormData] = useState({ name: '', room_type: 'Classroom', capacity: 30 }); const [status, setStatus] = useState(''); const handleSubmit = e => { e.preventDefault(); apiClient.post('/api/rooms', formData).then(() => setStatus('Room Saved!')); }; return (<form onSubmit={handleSubmit} className="space-y-6 max-w-xl"><h3 className="text-lg font-semibold">Room Information</h3><div><label>Room Name / Number</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300" required/></div><div><label>Room Type</label><select value={formData.room_type} onChange={e => setFormData({...formData, room_type: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300"><option>Classroom</option><option>Lab</option></select></div><div><label>Capacity</label><input type="number" value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300"/></div>{status && <p className="text-green-600">{status}</p>}<div className="text-right"><button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md">Save Room</button></div></form>);}
EOF

echo 'Creating frontend/src/components/forms/SubjectForm.jsx...'
cat <<'EOF' > "frontend/src/components/forms/SubjectForm.jsx"
import React, { useState } from 'react'; import apiClient from '../../api'; export default function SubjectForm() { const [formData, setFormData] = useState({ name: '', code: '', requires_lab: false }); const [status, setStatus] = useState(''); const handleSubmit = e => { e.preventDefault(); apiClient.post('/api/subjects', formData).then(() => setStatus('Subject Saved!')); }; return (<form onSubmit={handleSubmit} className="space-y-6 max-w-xl"><h3 className="text-lg font-semibold">Subject Information</h3><div><label>Subject Name</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300" required/></div><div><label>Subject Code</label><input type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="mt-1 block w-full rounded-md border-gray-300"/></div><div><label><input type="checkbox" checked={formData.requires_lab} onChange={e => setFormData({...formData, requires_lab: e.target.checked})}/> Requires Lab Component</label></div>{status && <p className="text-green-600">{status}</p>}<div className="text-right"><button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md">Save Subject</button></div></form>);}
EOF

echo 'Creating frontend/src/components/forms/TeacherForm.jsx...'
cat <<'EOF' > "frontend/src/components/forms/TeacherForm.jsx"
import React, { useState } from 'react';
import apiClient from '../../api';
export default function TeacherForm() {
    const [formData, setFormData] = useState({name: '', subject_taught: '', classes_taught: '', max_lectures_per_day: 5, lecture_type: 'Theory', theory_hours_per_week: 0, lab_hours_per_week: 0, is_visiting: false});
    const [avail, setAvail] = useState({monday: false, tuesday: false, wednesday: false, thursday: false, friday: false, saturday: false, from: '09:00', to: '17:00'});
    const [status, setStatus] = useState('');
    const handleFormChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
    const handleAvailChange = (e) => setAvail(p => ({ ...p, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
    const handleSubmit = e => {
        e.preventDefault();
        let payload = { ...formData };
        if(formData.is_visiting) {
            payload.availability = { days: Object.keys(avail).filter(k => avail[k] === true), from: avail.from, to: avail.to };
        }
        apiClient.post('/api/teachers', payload).then(() => setStatus('Teacher saved!'));
    };
    const inputClass="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm";
    return(
        <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Teacher Information</h3>
            <div><label className="block text-sm font-medium text-gray-700">Teacher Name</label><input type="text" name="name" value={formData.name} onChange={handleFormChange} placeholder="Enter teacher's full name" className={inputClass} required/></div>
            <div><label className="block text-sm font-medium text-gray-700">Subject Taught</label><input type="text" name="subject_taught" value={formData.subject_taught} onChange={handleFormChange} placeholder="e.g., Mathematics, Physics" className={inputClass}/></div>
            <div><label className="block text-sm font-medium text-gray-700">Classes Taught</label><input type="text" name="classes_taught" value={formData.classes_taught} onChange={handleFormChange} placeholder="e.g., 9A, 10B, 11-Science" className={inputClass}/></div>
            <div><label className="block text-sm font-medium text-gray-700">Preferred Max Lectures per Day</label><input type="number" name="max_lectures_per_day" value={formData.max_lectures_per_day} onChange={handleFormChange} placeholder="e.g., 5" className={inputClass}/></div>
            <div><label className="text-sm font-medium text-gray-700">Lecture Type</label><div className="flex space-x-4 mt-1"><label><input type="radio" name="lecture_type" value="Theory" checked={formData.lecture_type==='Theory'} onChange={handleFormChange}/> Theory</label><label><input type="radio" name="lecture_type" value="Lab" checked={formData.lecture_type==='Lab'} onChange={handleFormChange}/> Lab</label><label><input type="radio" name="lecture_type" value="Both" checked={formData.lecture_type==='Both'} onChange={handleFormChange}/> Both</label></div></div>
            <div className="grid grid-cols-2 gap-4">
                {(formData.lecture_type === 'Theory' || formData.lecture_type === 'Both') && <div><label>Theory Hours per Week</label><input type="number" name="theory_hours_per_week" value={formData.theory_hours_per_week} onChange={handleFormChange} className={inputClass} /></div>}
                {(formData.lecture_type === 'Lab' || formData.lecture_type === 'Both') && <div><label>Lab Hours per Week</label><input type="number" name="lab_hours_per_week" value={formData.lab_hours_per_week} onChange={handleFormChange} className={inputClass} /></div>}
            </div>
            <div className="relative flex items-start"><div className="flex h-6 items-center"><input id="is_visiting" name="is_visiting" type="checkbox" checked={formData.is_visiting} onChange={handleFormChange} className="h-4 w-4 rounded"/></div><div className="ml-3 text-sm"><label htmlFor="is_visiting">Is this a Visiting Faculty?</label></div></div>
            {formData.is_visiting && <div className="p-4 rounded-md bg-gray-50 border space-y-4"><p className="font-semibold">Visiting Faculty Availability</p><div className="grid grid-cols-3 gap-2">{Object.keys(avail).filter(k => k.endsWith('day')).map(day => (<label key={day}><input type="checkbox" name={day} checked={avail[day]} onChange={handleAvailChange} /> {day.charAt(0).toUpperCase()+day.slice(1)}</label>))}</div><div className="grid grid-cols-2 gap-4"><label>From <input type="time" name="from" value={avail.from} onChange={handleAvailChange} className={inputClass}/></label><label>To <input type="time" name="to" value={avail.to} onChange={handleAvailChange} className={inputClass}/></label></div></div>}
            {status && <p className={status.error ? "text-red-500" : "text-green-600"}>{status}</p>}
            <div className="text-right"><button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Save Teacher</button></div>
        </form>
    );
}
EOF

echo 'Creating frontend/src/components/Loader.jsx...'
cat <<'EOF' > "frontend/src/components/Loader.jsx"
import React from 'react'; export default function Loader({ statusMessage }) { return (<div className="fixed inset-0 bg-gray-100 flex items-center justify-center z-50"><div className="text-center"><p className="text-lg font-semibold">{statusMessage || 'Loading...'}</p></div></div>); }
EOF

echo 'Creating frontend/src/components/Navbar.jsx...'
cat <<'EOF' > "frontend/src/components/Navbar.jsx"
import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
const Navbar = () => {
    const { user, logout } = useAuth();
    const linkClass = ({ isActive }) => `px-3 py-2 text-sm font-medium rounded-md ${isActive ? 'text-blue-700 bg-blue-100' : 'text-gray-500 hover:text-gray-900'}`;
    return (
        <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md shadow-sm z-50">
            <div className="container mx-auto px-6 h-20 flex justify-between items-center">
                <NavLink to="/dashboard" className="text-2xl font-bold text-gray-800">Timetable Generator</NavLink>
                {user && (
                    <div className="flex items-center space-x-6">
                        <nav className="flex items-center space-x-4">
                            <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
                            <NavLink to="/data-entry" className={linkClass}>Data Entry</NavLink>
                            <NavLink to="/generate" className={linkClass}>Generate</NavLink>
                            <NavLink to="/timetable" className={linkClass}>Timetable</NavLink>
                        </nav>
                        <div className="flex items-center space-x-3">
                            <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg></button>
                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg cursor-pointer" onClick={logout} title={`Logout ${user.username}`}>{user.username.charAt(0).toUpperCase()}</div>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};
export default Navbar;
EOF

echo 'Creating frontend/src/context/AuthContext.jsx...'
cat <<'EOF' > "frontend/src/context/AuthContext.jsx"
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
const apiClient = axios.create({ baseURL: '/', withCredentials: true });
const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const checkSession = useCallback(async () => {
    try {
      const response = await apiClient.get('/auth/session');
      setUser(response.data.user);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    checkSession();
  }, [checkSession]);
  const login = (userData) => setUser(userData);
  const logout = async () => { await apiClient.post('/auth/logout'); setUser(null); };
  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
EOF

echo 'Creating frontend/src/main.jsx...'
cat <<'EOF' > "frontend/src/main.jsx"
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './styles/main.css';
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
EOF

echo 'Creating frontend/src/pages/Dashboard.jsx...'
cat <<'EOF' > "frontend/src/pages/Dashboard.jsx"
import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import { useNavigate } from 'react-router-dom';
const StatCard = ({ title, value, icon, color }) => ( <div className="bg-white p-6 rounded-xl shadow-md flex items-center justify-between"> <div> <p className="text-sm font-medium text-gray-500">{title}</p> <p className="text-3xl font-bold text-gray-900">{value}</p> </div> <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}> {icon} </div> </div> );
const ActionCard = ({ title, description, onClick }) => ( <button onClick={onClick} className="bg-white p-6 rounded-xl shadow-md text-left w-full hover:bg-gray-50 transition"> <p className="text-lg font-semibold text-gray-900">{title}</p> <p className="text-sm text-gray-500 mt-1">{description}</p> </button> );
export default function Dashboard() {
    const [summary, setSummary] = useState({ totalTeachers: 0, totalRooms: 0, totalSubjects: 0 });
    const navigate = useNavigate();
    useEffect(() => { apiClient.get('/api/dashboard-summary').then(res => setSummary(res.data)); }, []);
    const TeacherIcon = <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>;
    const RoomIcon = <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 11V3h16v8h-3v10h-4v-5H7v5H3V11H4z" /></svg>;
    const SubjectIcon = <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Teachers" value={summary.totalTeachers} icon={TeacherIcon} color="bg-blue-100" />
                <StatCard title="Total Rooms" value={summary.totalRooms} icon={RoomIcon} color="bg-green-100" />
                <StatCard title="Total Subjects" value={summary.totalSubjects} icon={SubjectIcon} color="bg-purple-100" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <ActionCard title="Add Teacher" description="Enter details for a new teacher." onClick={() => navigate('/data-entry', {state: { activeTab: 'Teachers'}})} />
                <ActionCard title="Add Room" description="Define a new classroom or lab." onClick={() => navigate('/data-entry', {state: { activeTab: 'Rooms'}})} />
                <ActionCard title="Add Subject" description="Create a new subject to be scheduled." onClick={() => navigate('/data-entry', {state: { activeTab: 'Subjects'}})} />
                <button onClick={() => navigate('/timetable')} className="bg-blue-600 p-6 rounded-xl shadow-md text-left w-full hover:bg-blue-700 transition">
                    <p className="text-lg font-semibold text-white">View Timetable</p>
                    <p className="text-sm text-blue-200 mt-1">Check the latest generated timetable.</p>
                </button>
            </div>
        </div>
    );
}
EOF

echo 'Creating frontend/src/pages/DataEntry.jsx...'
cat <<'EOF' > "frontend/src/pages/DataEntry.jsx"
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import TeacherForm from '../components/forms/TeacherForm';
import RoomForm from '../components/forms/RoomForm';
import SubjectForm from '../components/forms/SubjectForm';
export default function DataEntry() {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'Teachers');
    const tabs = ['Teachers', 'Rooms', 'Subjects'];
    const tabClass = (tabName) => `px-6 py-3 font-semibold rounded-t-lg transition-colors ${activeTab === tabName ? 'bg-white text-blue-600 border-x border-t' : 'bg-transparent text-gray-500 hover:text-gray-700'}`;
    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Manual Data Entry</h1>
            <p className="text-gray-600 mb-8">Add or manage your institution's core data here. When you are ready, proceed to the 'Generate' page.</p>
            <div className="border-b border-gray-200"><nav className="-mb-px flex space-x-4">{tabs.map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={tabClass(tab)}>{tab}</button>))}</nav></div>
            <div className="bg-white p-8 rounded-b-lg shadow-md max-w-4xl">
                {activeTab === 'Teachers' && <TeacherForm />}
                {activeTab === 'Rooms' && <RoomForm />}
                {activeTab === 'Subjects' && <SubjectForm />}
            </div>
        </div>
    );
}
EOF

echo 'Creating frontend/src/pages/Generate.jsx...'
cat <<'EOF' > "frontend/src/pages/Generate.jsx"
import React, { useState, useEffect } from 'react';
import apiClient from '../api';
import { useNavigate } from 'react-router-dom';
export default function GeneratePage() {
    const [task, setTask] = useState(null);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const handleGenerate = () => {
        setError('');
        setTask({ state: 'PENDING', status: 'Submitting job to the AI engine...' });
        apiClient.post('/api/generate')
            .then(res => setTask({ id: res.data.taskId, state: 'PENDING', status: 'Task is in the queue...' }))
            .catch(() => setError('Failed to start the generation process.'));
    };
    useEffect(() => {
        if (!task?.id) return;
        const pollStatus = () => {
            apiClient.get(`/api/task/${task.id}`).then(res => {
                const { state, status, result, error: taskError } = res.data;
                if (state === 'SUCCESS') {
                    navigate('/timetable', { state: { timetableResult: result } });
                } else if (state === 'FAILURE') {
                    setError(taskError || 'The generation task failed for an unknown reason.');
                    setTask(null);
                } else {
                    setTask(prev => ({ ...prev, state, status: status || prev.status, progress: res.data.progress }));
                    setTimeout(pollStatus, 3000);
                }
            }).catch(() => {
                setError('Could not retrieve task status from the server.');
                setTask(null);
            });
        };
        const timer = setTimeout(pollStatus, 1000);
        return () => clearTimeout(timer);
    }, [task?.id, navigate]);
    const isProcessing = task && task.state !== 'SUCCESS' && task.state !== 'FAILURE';
    return (
        <div className="container mx-auto px-4 py-16 text-center">
            <h1 className="text-4xl font-bold">Generate Your Timetable</h1>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                Ensure all your data is entered correctly on the 'Data Entry' page. Then, click the button below to start the AI generation.
            </p>
            <div className="mt-8">
                <button
                    onClick={handleGenerate}
                    disabled={isProcessing}
                    className="px-8 py-4 text-lg font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                    {isProcessing ? 'Generating...' : 'Start AI Generation'}
                </button>
            </div>
            {isProcessing && (
                 <div className="mt-8 max-w-xl mx-auto">
                     <p className="font-semibold">{task.status}</p>
                     <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{width: `${task.progress || 10}%`}}></div>
                     </div>
                 </div>
            )}
            {error && <p className="mt-4 text-red-600 font-semibold">Error: {error}</p>}
        </div>
    );
};
EOF

echo 'Creating frontend/src/pages/LoginPage.jsx...'
cat <<'EOF' > "frontend/src/pages/LoginPage.jsx"
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api';
export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await apiClient.post('/auth/login', { email, password });
            login(response.data.user);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
            setLoading(false);
        }
    };
    const inputClass = "block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm";
    return (
         <div className="flex flex-col justify-center items-center px-6 py-12 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-10 text-center text-3xl font-bold leading-9 tracking-tight text-gray-900">Welcome Back</h2>
                <p className="mt-2 text-center text-sm text-gray-600">Sign in to generate your timetable</p>
            </div>
            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white px-6 py-8 shadow-lg rounded-xl sm:px-10">
                    {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm text-center">{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div><label className="block text-sm font-medium leading-6 text-gray-900">Email Address</label><div className="mt-2"><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass}/></div></div>
                        <div><label className="block text-sm font-medium leading-6 text-gray-900">Password</label><div className="mt-2"><input type="password" value={password} onChange={e => setPassword(e.target.value)} required className={inputClass}/></div></div>
                        <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">{loading ? 'Signing In...' : 'Sign In'}</button>
                    </form>
                    <p className="mt-10 text-center text-sm text-gray-500">Don't have an account?{' '}<Link to="/signup" className="font-semibold leading-6 text-blue-600 hover:text-blue-500">Sign up for free</Link></p>
                </div>
            </div>
        </div>
    );
}
EOF

echo 'Creating frontend/src/pages/SignupPage.jsx...'
cat <<'EOF' > "frontend/src/pages/SignupPage.jsx"
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../api';
export default function SignupPage() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const handleSubmit = async (e) => {
        e.preventDefault(); setLoading(true); setError('');
        if (password.length < 6) {
             setError("Password must be at least 6 characters long.");
             setLoading(false);
             return;
        }
        try {
            await apiClient.post('/auth/signup', { username, email, password });
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.error || 'Signup failed. Please try a different email.');
            setLoading(false);
        }
    };
    const inputClass = "block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm";
    return (
         <div className="flex flex-col justify-center items-center px-6 py-12 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-10 text-center text-3xl font-bold leading-9 tracking-tight text-gray-900">Create an Account</h2>
                <p className="mt-2 text-center text-sm text-gray-600">Get started with the Timetable Generator</p>
            </div>
            <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white px-6 py-8 shadow-lg rounded-xl sm:px-10">
                    {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm text-center">{error}</div>}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div><label className="block text-sm font-medium leading-6 text-gray-900">Username</label><div className="mt-2"><input type="text" value={username} onChange={e => setUsername(e.target.value)} required className={inputClass}/></div></div>
                        <div><label className="block text-sm font-medium leading-6 text-gray-900">Email Address</label><div className="mt-2"><input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass}/></div></div>
                        <div><label className="block text-sm font-medium leading-6 text-gray-900">Password</label><div className="mt-2"><input type="password" value={password} onChange={e => setPassword(e.target.value)} required className={inputClass}/></div></div>
                        <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">{loading ? 'Creating Account...' : 'Create Account'}</button>
                    </form>
                    <p className="mt-10 text-center text-sm text-gray-500">Already have an account?{' '}<Link to="/login" className="font-semibold leading-6 text-blue-600 hover:text-blue-500">Log in</Link></p>
                </div>
            </div>
        </div>
    );
}
EOF

echo 'Creating frontend/src/pages/Timetable.jsx...'
cat <<'EOF' > "frontend/src/pages/Timetable.jsx"
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
const TimeSlot = ({ time }) => (<div className="h-28 flex items-center justify-center text-sm font-semibold text-gray-500 sticky left-0 bg-white z-10 border-r border-gray-200">{time}</div>);
const DayHeader = ({ day }) => (<div className="text-center font-bold text-gray-700 py-3 sticky top-0 bg-white z-10 border-b border-gray-200">{day.toUpperCase()}</div>);
const TimetableCard = ({ event, provided, snapshot }) => {
    const color = event.room.room_type === 'Lab' ? 'bg-green-100 border-green-300' : 'bg-blue-100 border-blue-300';
    return (
        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{...provided.draggableProps.style}} className={`p-2 rounded-lg border text-xs shadow-sm m-1 ${color} ${snapshot.isDragging ? 'ring-2 ring-blue-500 shadow-xl' : ''}`}>
            <p className="font-bold text-gray-800 truncate">{event.subject.name}</p>
            <p className="text-gray-600 truncate">{event.teacher.name}</p>
            <p className="text-gray-500 italic truncate">{event.room.name}</p>
        </div>
    );
};
const FilterDropdown = ({ name, label, value, onChange, options }) => (
    <div><label className="text-sm font-medium text-gray-700">{label}</label><select name={name} value={value} onChange={onChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"><option value="">All</option>{options.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}</select></div>
);
export default function TimetablePage() {
    const location = useLocation(); const navigate = useNavigate();
    const [gridSchedule, setGridSchedule] = useState({});
    const [flatSchedule, setFlatSchedule] = useState([]);
    const [filterOptions, setFilterOptions] = useState({ teachers: [], rooms: [], classes: [] });
    const [activeFilters, setActiveFilters] = useState({ teacher: '', room: '', class: '' });
    useEffect(() => {
        if (location.state?.timetableResult?.timetable) {
            const timetable = location.state.timetableResult.timetable;
            const unique = { teachers: new Map(), rooms: new Map(), classes: new Map() };
            const flattened = [];
            Object.values(timetable).forEach(day => {
                Object.values(day).forEach(slots => {
                    slots.forEach(event => {
                        flattened.push(event);
                        unique.teachers.set(event.teacher.id, event.teacher);
                        unique.rooms.set(event.room.id, event.room);
                    });
                });
            });
            setFlatSchedule(flattened);
            setFilterOptions({ teachers: Array.from(unique.teachers.values()), rooms: Array.from(unique.rooms.values()), classes: [] });
        }
    }, [location.state]);
    useEffect(() => {
        const newGrid = {};
        flatSchedule.filter(e => (activeFilters.teacher ? e.teacher.id == activeFilters.teacher : true) && (activeFilters.room ? e.room.id == activeFilters.room : true)).forEach(event => {
            if (!newGrid[event.day]) newGrid[event.day] = {};
            if (!newGrid[event.day][event.time]) newGrid[event.day][event.time] = [];
            newGrid[event.day][event.time].push(event);
        });
        setGridSchedule(newGrid);
    }, [flatSchedule, activeFilters]);
    if (flatSchedule.length === 0) {
        return ( <div className="container mx-auto px-4 py-16 text-center"><h1 className="text-3xl font-bold text-gray-900">View Timetable</h1><p className="mt-4 text-lg text-gray-600">Your generated timetable will appear here after a successful run.</p><button onClick={() => navigate('/generate')} className="mt-8 px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Go to Generate Page</button></div>);
    }
    const timeSlots = ['9', '10', '11', '12', '13', '14', '15', '16', '17'];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return (
        <div className="pb-16"><div className="flex justify-between items-center mb-6"><h1 className="text-3xl font-bold text-gray-900">View Timetable</h1><div className="flex space-x-2"><button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Print</button><button className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300">Export as PDF</button></div></div>
            <div className="bg-white p-4 rounded-lg shadow-md mb-8 grid md:grid-cols-3 gap-4"><FilterDropdown name="teacher" label="Filter by Teacher" value={activeFilters.teacher} onChange={e => setActiveFilters({...activeFilters, teacher: e.target.value})} options={filterOptions.teachers} /><FilterDropdown name="room" label="Filter by Room" value={activeFilters.room} onChange={e => setActiveFilters({...activeFilters, room: e.target.value})} options={filterOptions.rooms} /></div>
            <DragDropContext onDragEnd={()=>{}}><div className="bg-white rounded-lg shadow-md overflow-x-auto"><div className="grid grid-cols-[120px_repeat(6,1fr)] min-w-[900px]"><div className="sticky top-0 bg-white z-20"></div>{days.map(day => <DayHeader key={day} day={day} />)}{timeSlots.map(timeKey => (<React.Fragment key={timeKey}><TimeSlot time={`${timeKey}:00 - ${parseInt(timeKey) + 1}:00`} />{days.map(day => (<Droppable key={`${day}-${timeKey}`} droppableId={`${day}-${timeKey}`}>{(provided) => (<div ref={provided.innerRef} {...provided.droppableProps} className="h-32 border-t border-r border-gray-200">{(gridSchedule[day]?.[timeKey] || []).map((event, index) => (<Draggable key={event.id} draggableId={event.id} index={index}>{(p, s) => <TimetableCard event={event} provided={p} snapshot={s} />}</Draggable>))}{provided.placeholder}</div>)}</Droppable>))}</React.Fragment>))}</div></div></DragDropContext>
        </div>
    );
}
EOF

echo 'Creating frontend/src/styles/main.css...'
cat <<'EOF' > "frontend/src/styles/main.css"
@tailwind base;
@tailwind components;
@tailwind utilities;
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f5f7fa;
}
.container { max-width: 1200px; }
table { border-collapse: separate; border-spacing: 0; }
th, td { border: 1px solid #e2e8f0; }
th { background-color: #f7fafc; }
tr:nth-child(even) { background-color: #f8fafc; }
.bg-blue-100 { background-color: #dbeafe; }
.bg-green-100 { background-color: #dcfce7; }
.bg-yellow-100 { background-color: #fef9c3; }
.bg-red-100 { background-color: #fee2e2; }
EOF

echo 'Creating frontend/tailwind.config.js...'
cat <<'EOF' > "frontend/tailwind.config.js"
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

echo 'Creating frontend/vite.config.js...'
cat <<'EOF' > "frontend/vite.config.js"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true }, '/auth': { target: 'http://localhost:5000', changeOrigin: true } }
  }
})
EOF

echo 'Creating my_project_bundle.sh...'
cat <<'EOF' > "my_project_bundle.sh"
EOF

echo 'Creating package_project.sh...'
cat <<'EOF' > "package_project.sh"
#!/bin/bash
# A self-extracting script to recreate the entire project.
# USAGE: bash package_project.sh

echo "--- Generating a text bundle of the project... ---"
echo "# This is a self-extracting bash script."
echo "# To unpack, run: bash <filename>"
echo "set -e"
echo "echo 'Unpacking project...'"
echo "mkdir -p extracted_project && cd extracted_project || exit"
echo

# Find directories and create them
find . -type d -not -path './.git*' -not -path '*__pycache__*' | while read -r dir; do
    if [ "$dir" != "." ]; then
        echo "mkdir -p \"${dir#./}\""
    fi
done

echo

# Find text files, check for binaries, and embed them using a 'heredoc'
find . -type f -not -path './.git/*' -not -path '*.pyc' -not -path './venv/*' -not -path './.venv/*' -not -path './.env' -not -path './node_modules/*' -not -path './dist/*' -not -path './build/*' | while read -r file; do
    # Simple binary check: if grep finds a null byte, consider it binary
    if ! grep -q -I . "$file"; then
        echo "# --- SKIPPING BINARY FILE: $file ---"
    else
        echo "echo 'Creating ${file#./}...'"
        echo "cat <<'EOF' > \"${file#./}\""
        cat "$file"
        echo "EOF"
        echo
    fi
done

echo "echo 'Project successfully unpacked into the extracted_project/ directory!'"
EOF

echo 'Creating README.md...'
cat <<'EOF' > "README.md"
# Optimized Academic Timetable Generation System
A hybrid AI-powered system for generating conflict-free academic timetables using neural networks trained by genetic algorithms.
## Features
- **7 Strict Constraints Enforcement**:
  - Teacher, room, and class conflicts
  - Room type matching (lab vs classroom)
  - Back-to-back class limits
  - Maximum weekly hours
  - Visiting faculty availability
- **Hybrid AI Architecture**:
  - Neural networks for pattern recognition
  - Genetic algorithms for optimization
  - Constraint-aware fitness functions
- **Production-Ready Infrastructure**:
  - Docker containers
  - PostgreSQL database
  - Redis message queue
  - Celery task processing
## System Architecture
`optimized-timetable-system/`
## Installation
1. **Prerequisites**: Docker & Docker Compose
2. **Setup**: `docker-compose up --build`
3. **Access**: `http://localhost`
## Testing
`docker-compose exec backend pytest`
EOF

echo 'Project successfully unpacked into the extracted_project/ directory!'
