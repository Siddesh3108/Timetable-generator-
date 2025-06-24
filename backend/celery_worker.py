# THIS IS THE CRITICAL FIX.
# By importing the celery_tasks module here, we ensure that the
# @celery.task decorator is run, and the task is registered with the
# Celery application when the worker starts. This solves the
# 'task not found' error.
from app import create_app
from app.ai_engine import celery_tasks

app = create_app()
celery_app = app.extensions["celery"]
