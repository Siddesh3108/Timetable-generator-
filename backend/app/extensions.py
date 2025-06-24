from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from flask_login import LoginManager
from celery import Celery

db = SQLAlchemy()
migrate = Migrate()
bcrypt = Bcrypt()
login_manager = LoginManager()

# --- THIS IS THE CRITICAL FIX ---
# We add the `include` argument to tell Celery which modules to search for tasks.
celery = Celery(
    __name__, 
    broker_url='redis://redis:6379/0', 
    backend='redis://redis:6379/0',
    include=['app.ai_engine.celery_tasks']  # This line registers our tasks.
)
# --- END OF FIX ---

@login_manager.user_loader
def load_user(user_id):
    from .models import User
    return User.query.get(int(user_id))
