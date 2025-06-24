from flask import Flask
from .config import Config
from .extensions import db, migrate, bcrypt, login_manager, celery
from flask_cors import CORS

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://localhost"])
    db.init_app(app); migrate.init_app(app, db); bcrypt.init_app(app); login_manager.init_app(app)
    
    # Correctly configure Celery with the Flask app context
    celery.conf.update(app.config)
    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)
    celery.Task = ContextTask
    
    from .api.routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    from .auth_routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')
    
    return app
