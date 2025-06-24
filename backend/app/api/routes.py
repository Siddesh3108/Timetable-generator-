from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from ..extensions import db, celery
from ..models import Teacher, Room, Subject

api_bp = Blueprint('api', __name__)

# --- All other routes are correct and remain unchanged ---
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
    from ..ai_engine.tasks import generate_timetable_task
    task = generate_timetable_task.delay(user_id=current_user.id)
    return jsonify({"message": "Generation started!", "taskId": task.id}), 202

# --- THIS IS THE CORRECTED, MORE ROBUST VERSION ---
@api_bp.route('/task/<task_id>', methods=['GET'])
@login_required
def get_task_status(task_id):
    from ..ai_engine.tasks import generate_timetable_task
    task = generate_timetable_task.AsyncResult(task_id)
    
    response = {'state': task.state}
    
    if task.state == 'PENDING':
        response['status'] = 'Task is in the queue...'
    elif task.state == 'PROGRESS':
        response.update(task.info)
    elif task.state == 'SUCCESS':
        response['result'] = task.result
    elif task.state == 'FAILURE':
        # This is the simplified, safer way to handle a failure.
        # It prevents the API from crashing if the error info is unusual.
        response['error'] = str(task.info) if task.info else 'Task failed with no specific error.'
        
    return jsonify(response)
