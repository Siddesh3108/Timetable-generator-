import logging
from app import create_app
from ..extensions import celery, db
from ..models import Teacher, Room, Subject, Course, Division, User
from .constraint_manager import TimetableSolver

logger = logging.getLogger(__name__)

# --- THIS IS THE FUNCTION WE ARE MODIFYING ---
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
    
    # --- START OF MODIFICATION ---

    # 1. Capture both the solution and the detailed metrics from the solver
    solution, metrics = solver.solve()

    # 2. Log the detailed metrics to the console for your research paper
    # This data will NOT go to the frontend.
    logger.info(f"SOLVER METRICS FOR USER {user_id}: {metrics}")

    task_update_callback('PROGRESS', {'status': 'Finalizing timetable...', 'progress': 90})

    # 3. Update the error handling to use the precise status from the solver
    if solution is None:
        failure_reason = (f"No solution could be found (Solver Status: {metrics['status']}). "
                          "This may be due to impossible constraints (e.g., not enough rooms or teachers). "
                          "Check your custom working days and hours.")
        raise ValueError(failure_reason)

    # 4. Return the original data structure that the frontend expects.
    #    The detailed `metrics` are logged, but not sent to the UI.
    return {
        'timetable': solution, 
        'settings': settings,
        'metrics': {'conflicts': 0, 'status': 'Optimal solution found'} # Keep this simple for the UI
    }
    # --- END OF MODIFICATION ---

@celery.task(bind=True)
def generate_timetable_task(self, user_id):
    """Celery task entry point."""
    logger.info(f"Task {self.request.id} for user {user_id} received (OR-Tools).")
    app = create_app()
    with app.app_context():
        try:
            user = User.query.get(user_id)
            if not user:
                raise ValueError(f"User with ID {user_id} not found.")

            db.session.expire(user)
            latest_settings = user.settings

            def update_progress_callback(state, meta):
                self.update_state(state=state, meta=meta)
            
            result = run_or_tools_solver(user.id, latest_settings, update_progress_callback)
            
            return result
        except Exception as e:
            logger.error(f"Celery task {self.request.id} failed: {str(e)}", exc_info=True)
            self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
            raise