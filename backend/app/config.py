import os
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'a-very-secret-key')
    # Hardcoding the correct URL is the most robust solution here.
    SQLALCHEMY_DATABASE_URI = 'postgresql://user:password@db/timetable_db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CELERY_BROKER_URL = 'redis://redis:6379/0'
    CELERY_RESULT_BACKEND = 'redis://redis:6379/0'
