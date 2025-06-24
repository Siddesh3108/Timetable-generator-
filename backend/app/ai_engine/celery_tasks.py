import logging
from app import create_app
from ..extensions import celery
from ..models import Teacher, Room, Subject
from .genetic_algorithm import GeneticOptimizer
from .constraint_manager import ConstraintManager
from .nn_model import TimetableModel

logger = logging.getLogger(__name__)

# --- THIS IS THE NEW, CRUCIAL HELPER FUNCTION ---
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
# --- END OF HELPER FUNCTION ---

def run_ai_generation_logic(user_id, task_update_callback):
    task_update_callback('PROGRESS', {'status': 'Fetching latest data...', 'progress': 5})
    teachers = Teacher.query.filter_by(user_id=user_id).all()
    rooms = Room.query.filter_by(user_id=user_id).all()
    subjects = Subject.query.filter_by(user_id=user_id).all()
    if not all([teachers, rooms, subjects]):
        raise ValueError("Insufficient data. Please add at least one Teacher, Room, and Subject.")
    
    task_update_callback('PROGRESS', {'status': 'Initializing AI constraints...', 'progress': 15})
    cm = ConstraintManager(teachers, rooms, subjects)
    input_data = cm.get_feature_matrix()
    if input_data.size == 0:
        raise ValueError("Could not generate feature matrix from the data provided.")

    task_update_callback('PROGRESS', {'status': 'Building neural network...', 'progress': 25})
    model = TimetableModel(input_shape=input_data.shape, num_constraints=len(cm.get_constraint_types()))
    model.build(input_shape=(None, input_data.shape[1])); model.compile(optimizer='adam')
    
    task_update_callback('PROGRESS', {'status': 'Optimizing with Genetic Algorithm...', 'progress': 40})
    ga = GeneticOptimizer() # Use default faster params
    best_weights = ga.optimize(model, input_data, cm)
    model.set_weights(best_weights)

    task_update_callback('PROGRESS', {'status': 'Generating final timetable...', 'progress': 85})
    predictions = model(input_data)
    timetable_grid, raw_events = cm.decode_timetable(predictions.numpy())
    metrics = cm.evaluate_timetable(raw_events)

    # --- THIS IS THE FINAL FIX ---
    # We serialize the grid before returning it
    serialized_grid = serialize_timetable(timetable_grid)
    return {'timetable': serialized_grid, 'metrics': metrics}
    # --- END OF FIX ---

@celery.task(bind=True)
def generate_timetable_task(self, user_id):
    logger.info(f"Task {self.request.id} for user {user_id} received.")
    app = create_app()
    with app.app_context():
        try:
            def update_progress_callback(state, meta): self.update_state(state=state, meta=meta)
            result = run_ai_generation_logic(user_id, update_progress_callback)
            return result
        except Exception as e:
            logger.error(f"Celery task {self.request.id} failed: {str(e)}", exc_info=True)
            self.update_state(state='FAILURE', meta={'exc_type': type(e).__name__, 'exc_message': str(e)})
            raise
