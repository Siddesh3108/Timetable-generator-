import logging
from app import create_app
from ..extensions import celery
from ..models import Teacher, Room, Subject
from .constraint_manager import ConstraintManager

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

def run_or_tools_generation(user_id, task_update_callback):
    task_update_callback('PROGRESS', {'status': 'Fetching latest data...', 'progress': 10})
    teachers = Teacher.query.filter_by(user_id=user_id).all()
    rooms = Room.query.filter_by(user_id=user_id).all()
    subjects = Subject.query.filter_by(user_id=user_id).all()
    
    if not all([teachers, rooms, subjects]):
        raise ValueError("Insufficient data. Please add at least one Teacher, Room, and Subject.")

    task_update_callback('PROGRESS', {'status': 'Initializing constraint solver...', 'progress': 30})
    cm = ConstraintManager(teachers, rooms, subjects)

    task_update_callback('PROGRESS', {'status': 'Solving with OR-Tools CP-SAT...', 'progress': 50})
    # This single function call replaces the entire GA + NN + Heuristic process
    timetable_grid, raw_events = cm.decode_timetable_with_ortools()

    task_update_callback('PROGRESS', {'status': 'Finalizing timetable...', 'progress': 90})
    metrics = cm.evaluate_timetable(raw_events)

    serialized_grid = serialize_timetable(timetable_grid)
    return {'timetable': serialized_grid, 'metrics': metrics}


@celery.task(bind=True)
def generate_timetable_task(self, user_id):
    logger.info(f"Task {self.request.id} for user {user_id} started with OR-Tools.")
    app = create_app()
    with app.app_context():
        try:
            def update_progress_callback(state, meta): self.update_state(state=state, meta=meta)
            result = run_or_tools_generation(user_id, update_progress_callback)
            return result
        except Exception as e:
            logger.error(f"Celery task {self.request.id} failed: {str(e)}", exc_info=True)
            self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
            raise
