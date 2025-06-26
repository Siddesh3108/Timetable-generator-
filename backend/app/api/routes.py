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

# --- CRUD Endpoints for Data Entry (Corrected) ---

@api_bp.route('/teachers', methods=['GET'])
@login_required
def get_teachers():
    teachers = Teacher.query.filter_by(user_id=current_user.id).all()
    result = [{
        'id': t.id, 'name': t.name, 'subject_taught': t.subject_taught, 'classes_taught': t.classes_taught,
        'max_lectures_per_day': t.max_lectures_per_day, 'lecture_type': t.lecture_type,
        'theory_hours_per_week': t.theory_hours_per_week, 'lab_hours_per_week': t.lab_hours_per_week,
        'is_visiting': t.is_visiting
    } for t in teachers]
    return jsonify(result)

@api_bp.route('/rooms', methods=['GET'])
@login_required
def get_rooms():
    rooms = Room.query.filter_by(user_id=current_user.id).all()
    result = [{'id': r.id, 'name': r.name, 'room_type': r.room_type, 'capacity': r.capacity} for r in rooms]
    return jsonify(result)

@api_bp.route('/subjects', methods=['GET'])
@login_required
def get_subjects():
    subjects = Subject.query.filter_by(user_id=current_user.id).all()
    result = [{'id': s.id, 'name': s.name, 'code': s.code, 'requires_lab': s.requires_lab} for s in subjects]
    return jsonify(result)

@api_bp.route('/teachers', methods=['POST'])
@login_required
def add_teacher():
    data = request.get_json()
    new_item = Teacher(user_id=current_user.id, **data)
    db.session.add(new_item)
    db.session.commit()
    return jsonify({'id': new_item.id}), 201

# Add other POST, DELETE routes similarly...
@api_bp.route('/rooms', methods=['POST'])
@login_required
def add_room(): data = request.get_json(); new_item = Room(user_id=current_user.id, **data); db.session.add(new_item); db.session.commit(); return jsonify({'id': new_item.id}), 201
@api_bp.route('/subjects', methods=['POST'])
@login_required
def add_subject(): data = request.get_json(); new_item = Subject(user_id=current_user.id, **data); db.session.add(new_item); db.session.commit(); return jsonify({'id': new_item.id}), 201

@api_bp.route('/teachers/<int:item_id>', methods=['DELETE'])
@login_required
def delete_teacher(item_id): item = Teacher.query.get_or_404(item_id); db.session.delete(item); db.session.commit(); return jsonify({'message':'deleted'}), 200
@api_bp.route('/rooms/<int:item_id>', methods=['DELETE'])
@login_required
def delete_room(item_id): item = Room.query.get_or_404(item_id); db.session.delete(item); db.session.commit(); return jsonify({'message':'deleted'}), 200
@api_bp.route('/subjects/<int:item_id>', methods=['DELETE'])
@login_required
def delete_subject(item_id): item = Subject.query.get_or_404(item_id); db.session.delete(item); db.session.commit(); return jsonify({'message':'deleted'}), 200

# AI Generation Routes (unchanged)
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
    if task.state == 'PENDING': response['status'] = 'Task is in the queue...'
    elif task.state == 'PROGRESS': response.update(task.info)
    elif task.state == 'SUCCESS': response['result'] = task.result
    elif task.state == 'FAILURE': response['error'] = str(task.info) if task.info else 'Task failed with no specific error.'
    return jsonify(response)

# --- PUT (UPDATE) ENDPOINTS ---

@api_bp.route('/teachers/<int:item_id>', methods=['PUT'])
@login_required
def update_teacher(item_id):
    item = Teacher.query.get_or_404(item_id)
    if item.user_id != current_user.id: return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    for key, value in data.items():
        if hasattr(item, key):
            setattr(item, key, value)
    db.session.commit()
    return jsonify({'message': 'Teacher updated successfully'}), 200

@api_bp.route('/rooms/<int:item_id>', methods=['PUT'])
@login_required
def update_room(item_id):
    item = Room.query.get_or_404(item_id)
    if item.user_id != current_user.id: return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    for key, value in data.items():
        if hasattr(item, key):
            setattr(item, key, value)
    db.session.commit()
    return jsonify({'message': 'Room updated successfully'}), 200

@api_bp.route('/subjects/<int:item_id>', methods=['PUT'])
@login_required
def update_subject(item_id):
    item = Subject.query.get_or_404(item_id)
    if item.user_id != current_user.id: return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    for key, value in data.items():
        if hasattr(item, key):
            setattr(item, key, value)
    db.session.commit()
    return jsonify({'message': 'Subject updated successfully'}), 200
