from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from ..extensions import db
from ..models import Teacher, Room, Subject, Division, Batch, Course

api_bp = Blueprint('api', __name__)

# ==============================================================================
# --- NEW: SETTINGS API ---
# ==============================================================================

@api_bp.route('/settings', methods=['GET'])
@login_required
def get_settings():
    """Returns the current user's settings."""
    return jsonify(current_user.settings)

@api_bp.route('/settings', methods=['PUT'])
@login_required
def update_settings():
    """Updates the user's settings."""
    data = request.get_json()
    
    # Create a copy to update, ensuring we don't wipe existing settings
    new_settings = current_user.settings.copy()
    new_settings.update(data)
    
    current_user.settings = new_settings
    db.session.commit()
    
    return jsonify({"message": "Settings saved successfully"}), 200

# ==============================================================================
# --- 1. DASHBOARD ---
# ==============================================================================

@api_bp.route('/dashboard-summary')
@login_required
def dashboard_summary():
    """Provides a quick count of main entities for the dashboard."""
    return jsonify({
        'totalTeachers': Teacher.query.filter_by(user_id=current_user.id).count(),
        'totalRooms': Room.query.filter_by(user_id=current_user.id).count(),
        'totalSubjects': Subject.query.filter_by(user_id=current_user.id).count()
    })

# ==============================================================================
# --- 2. DATA ENTRY RESOURCES (TEACHERS, ROOMS, SUBJECTS) ---
# ==============================================================================

# --- Teachers ---
@api_bp.route('/teachers', methods=['GET'])
@login_required
def get_teachers():
    teachers = Teacher.query.filter_by(user_id=current_user.id).all()
    result = [{'id': t.id, 'name': t.name, 'subject_taught': t.subject_taught, 'max_lectures_per_day': t.max_lectures_per_day, 'is_visiting': t.is_visiting, 'availability': t.availability} for t in teachers]
    return jsonify(result)

@api_bp.route('/teachers', methods=['POST'])
@login_required
def add_teacher():
    data = request.get_json()
    new_item = Teacher(user_id=current_user.id, name=data.get('name'), subject_taught=data.get('subject_taught'), max_lectures_per_day=data.get('max_lectures_per_day'), is_visiting=data.get('is_visiting', False), availability=data.get('availability', {}))
    db.session.add(new_item)
    db.session.commit()
    return jsonify({'id': new_item.id}), 201

@api_bp.route('/teachers/<int:item_id>', methods=['PUT'])
@login_required
def update_teacher(item_id):
    item = Teacher.query.get_or_404(item_id)
    if item.user_id != current_user.id: return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    for key, value in data.items():
        if hasattr(item, key) and key != 'id': setattr(item, key, value)
    db.session.commit()
    return jsonify({'message': 'Teacher updated successfully'}), 200

@api_bp.route('/teachers/<int:item_id>', methods=['DELETE'])
@login_required
def delete_teacher(item_id):
    Course.query.filter_by(teacher_id=item_id, user_id=current_user.id).delete()
    item = Teacher.query.get_or_404(item_id)
    if item.user_id != current_user.id: return jsonify({'error': 'Unauthorized'}), 403
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message':'deleted'}), 200

# --- Rooms ---
@api_bp.route('/rooms', methods=['GET'])
@login_required
def get_rooms():
    rooms = Room.query.filter_by(user_id=current_user.id).all()
    result = [{'id': r.id, 'name': r.name, 'room_type': r.room_type, 'capacity': r.capacity} for r in rooms]
    return jsonify(result)

@api_bp.route('/rooms', methods=['POST'])
@login_required
def add_room():
    data = request.get_json(); new_item = Room(user_id=current_user.id, **data); db.session.add(new_item); db.session.commit(); return jsonify({'id': new_item.id}), 201

@api_bp.route('/rooms/<int:item_id>', methods=['DELETE'])
@login_required
def delete_room(item_id):
    item = Room.query.get_or_404(item_id)
    if item.user_id != current_user.id: return jsonify({'error': 'Unauthorized'}), 403
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message':'deleted'}), 200

# --- Subjects ---
@api_bp.route('/subjects', methods=['GET'])
@login_required
def get_subjects():
    subjects = Subject.query.filter_by(user_id=current_user.id).all()
    result = [{'id': s.id, 'name': s.name, 'code': s.code, 'theory_lectures_per_week': s.theory_lectures_per_week, 'lab_sessions_per_week': s.lab_sessions_per_week} for s in subjects]
    return jsonify(result)

@api_bp.route('/subjects', methods=['POST'])
@login_required
def add_subject():
    data = request.get_json(); new_item = Subject(user_id=current_user.id, **data); db.session.add(new_item); db.session.commit(); return jsonify({'id': new_item.id}), 201

@api_bp.route('/subjects/<int:item_id>', methods=['PUT'])
@login_required
def update_subject(item_id):
    item = Subject.query.get_or_404(item_id)
    if item.user_id != current_user.id: return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    for key, value in data.items():
        if hasattr(item, key) and key != 'id': setattr(item, key, value)
    db.session.commit()
    return jsonify({'message': 'Subject updated successfully'}), 200

@api_bp.route('/subjects/<int:item_id>', methods=['DELETE'])
@login_required
def delete_subject(item_id):
    Course.query.filter_by(subject_id=item_id, user_id=current_user.id).delete()
    item = Subject.query.get_or_404(item_id)
    if item.user_id != current_user.id: return jsonify({'error': 'Unauthorized'}), 403
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message':'deleted'}), 200

# ==============================================================================
# --- 3. ACADEMIC SETUP RESOURCES (DIVISIONS, COURSES) ---
# ==============================================================================

# --- Divisions ---
@api_bp.route('/divisions', methods=['GET'])
@login_required
def get_divisions():
    # Important: Remove the `is_active=True` filter if you are no longer using soft delete.
    divisions = Division.query.filter_by(user_id=current_user.id).all()
    result = [{'id': d.id, 'name': d.name} for d in divisions]
    return jsonify(result)

@api_bp.route('/divisions', methods=['POST'])
@login_required
def add_division():
    data = request.get_json()
    new_item = Division(user_id=current_user.id, name=data.get('name'))
    db.session.add(new_item)
    db.session.commit()
    return jsonify({'id': new_item.id, 'name': new_item.name}), 201

@api_bp.route('/divisions/<int:item_id>', methods=['PUT'])
@login_required
def update_division(item_id):
    item = Division.query.get_or_404(item_id)
    if item.user_id != current_user.id: 
        return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    item.name = data.get('name', item.name)
    db.session.commit()
    return jsonify({'message': 'Division updated successfully'}), 200

@api_bp.route('/divisions/<int:item_id>', methods=['DELETE'])
@login_required
def delete_division(item_id):
    item = Division.query.get_or_404(item_id)
    if item.user_id != current_user.id: 
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Delete associated courses first to maintain data integrity
    for batch in item.batches:
        Course.query.filter_by(batch_id=batch.id, user_id=current_user.id).delete()
    
    # Now, permanently delete the division
    db.session.delete(item)
    db.session.commit()
    
    return jsonify({'message':'Division permanently deleted.'}), 200

# --- Courses ---
@api_bp.route('/courses', methods=['GET'])
@login_required
def get_courses():
    courses = Course.query.filter_by(user_id=current_user.id).all()
    result = [{'id': c.id, 'subject_id': c.subject_id, 'teacher_id': c.teacher_id, 'division_id': c.batch.division_id, 'subject_name': c.subject.name, 'teacher_name': c.teacher.name, 'division_name': c.batch.division.name } for c in courses]
    return jsonify(result)

@api_bp.route('/courses', methods=['POST'])
@login_required
def add_course():
    data = request.get_json()
    division_id = data.get('division_id'); teacher_id = data.get('teacher_id'); subject_id = data.get('subject_id')
    if not all([division_id, teacher_id, subject_id]): return jsonify({'error': 'Division, Teacher, and Subject are required'}), 400
    
    division = Division.query.get_or_404(division_id)
    batch_name = f"{division.name}-Main"
    main_batch = Batch.query.filter_by(division_id=division.id, name=batch_name).first()
    if not main_batch:
        main_batch = Batch(name=batch_name, division_id=division.id, user_id=current_user.id); db.session.add(main_batch); db.session.commit()

    new_course = Course(subject_id=subject_id, teacher_id=teacher_id, batch_id=main_batch.id, user_id=current_user.id)
    db.session.add(new_course)
    db.session.commit()
    return jsonify({'id': new_course.id}), 201

@api_bp.route('/courses/<int:item_id>', methods=['PUT'])
@login_required
def update_course(item_id):
    item = Course.query.get_or_404(item_id)
    if item.user_id != current_user.id: return jsonify({'error': 'Unauthorized'}), 403
    data = request.get_json()
    division_id = data.get('division_id')
    if division_id:
        division = Division.query.get_or_404(division_id)
        batch_name = f"{division.name}-Main"
        main_batch = Batch.query.filter_by(division_id=division.id, name=batch_name).first()
        if not main_batch: main_batch = Batch(name=batch_name, division_id=division.id, user_id=current_user.id); db.session.add(main_batch); db.session.commit()
        item.batch_id = main_batch.id
    if data.get('subject_id'): item.subject_id = data.get('subject_id')
    if data.get('teacher_id'): item.teacher_id = data.get('teacher_id')
    db.session.commit()
    return jsonify({'message': 'Course updated successfully'}), 200

@api_bp.route('/courses/<int:item_id>', methods=['DELETE'])
@login_required
def delete_course(item_id):
    item = Course.query.get_or_404(item_id)
    if item.user_id != current_user.id: return jsonify({'error': 'Unauthorized'}), 403
    db.session.delete(item)
    db.session.commit()
    return jsonify({'message':'deleted'}), 200

# ==============================================================================
# --- 4. AI & TIMETABLE GENERATION ---
# ==============================================================================

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