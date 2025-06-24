from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
from flask_login import LoginManager
from celery import Celery

db = SQLAlchemy()
migrate = Migrate()
bcrypt = Bcrypt()
login_manager = LoginManager()
celery = Celery() # Create an empty object, to be configured by the app factory

@login_manager.user_loader
def load_user(user_id):
    from .models import User
    return User.query.get(int(user_id))
