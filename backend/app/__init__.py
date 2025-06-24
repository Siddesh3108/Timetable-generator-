from flask import Flask
from .config import Config
from .extensions import db, migrate, bcrypt, login_manager, celery
from flask_cors import CORS

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Init extensions
    db.init_app(app); migrate.init_app(app, db); bcrypt.init_app(app); login_manager.init_app(app)
    CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://localhost"])
    
    # Configure Celery with the application factory pattern
    celery.config_from_object(app.config, namespace='CELERY')
    celery.autodiscover_tasks(['app.ai_engine'])
    app.extensions["celery"] = celery

    # Register blueprints
    from .api.routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    from .auth_routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')
    
    return app
