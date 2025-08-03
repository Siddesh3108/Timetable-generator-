import logging
from app import create_app
from ..extensions import celery, db  # Make sure 'db' is imported
from ..models import Teacher, Room, Subject, Course, Division, User
from .constraint_manager import TimetableSolver

logger = logging.getLogger(__name__)

# This function is correct and does not need to change.
def run_or_tools_solver(user_id, settings, task_update_callback):
    """The main logic function that uses the new OR-Tools solver."""
    task_update_callback('PROGRESS', {'status': 'Fetching latest data from database...', 'progress': 10})
    
    courses = Course.query.filter_by(user_id=user_id).all()
    rooms = Room.query.filter_by(user_id=user_id).all()
    teachers = Teacher.query.filter_by(user_id=user_id).all()
    divisions = Division.query.filter_by(user_id=user_id).all()

    if not all([courses, rooms, teachers, divisions]):
        raise ValueError("Insufficient data. Please ensure you have created Divisions, Rooms, Teachers, Subjects, and assigned Courses.")

    task_update_callback('PROGRESS', {'status': 'Initializing constraint solver with your custom settings...', 'progress': 30})
    
    solver = TimetableSolver(courses, rooms, teachers, divisions, settings)

    task_update_callback('PROGRESS', {'status': 'Solving... This may take a few moments.', 'progress': 50})
    
    solution = solver.solve()

    task_update_callback('PROGRESS', {'status': 'Finalizing timetable...', 'progress': 90})

    if solution is None:
        raise ValueError("No solution could be found. This may be due to impossible constraints (e.g., not enough rooms or teachers for the required lectures). Check your custom working days and hours.")

    return {
        'timetable': solution, 
        'settings': settings,
        'metrics': {'conflicts': 0, 'status': 'Optimal solution found'}
    }

# --- THIS IS THE FUNCTION WITH THE CRITICAL FIX ---
@celery.task(bind=True)
def generate_timetable_task(self, user_id):
    """Celery task entry point."""
    logger.info(f"Task {self.request.id} for user {user_id} received (OR-Tools).")
    app = create_app()
    with app.app_context():
        try:
            # Step 1: Get the user object. It might have stale data.
            user = User.query.get(user_id)
            if not user:
                raise ValueError(f"User with ID {user_id} not found.")

            # Step 2: THE CRITICAL FIX
            # Tell the session to "expire" the user object. This marks all its
            # data as invalid and forces a fresh database query on the next access.
            db.session.expire(user)
            
            # Step 3: Access user.settings. This access now forces SQLAlchemy
            # to run a new SELECT query to get the latest settings from the DB.
            latest_settings = user.settings

            def update_progress_callback(state, meta):
                self.update_state(state=state, meta=meta)
            
            # Step 4: Pass the guaranteed fresh settings to the solver.
            result = run_or_tools_solver(user.id, latest_settings, update_progress_callback)
            
            return result
        except Exception as e:
            logger.error(f"Celery task {self.request.id} failed: {str(e)}", exc_info=True)
            self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
            raise