import pytest
import numpy as np
from app.ai_engine import generate_timetable
from app.ai_engine.constraint_manager import ConstraintManager
from app.ai_engine.genetic_algorithm import GeneticOptimizer
from app.ai_engine.nn_model import TimetableModel
from app.models import Constraint
@pytest.fixture
def sample_constraints():
    return [
        {'teacher_id': 'T1','course_id': 'C1','room_id': 'R1','class_id': 'Class1','timeslot': 1,'room_type': 'classroom','max_hours': 20,'max_consecutive': 3,'is_visiting': False,'availability': []},
        {'teacher_id': 'T2','course_id': 'C2','room_id': 'R2','class_id': 'Class2','timeslot': 2,'room_type': 'lab','max_hours': 15,'max_consecutive': 2,'is_visiting': True,'availability': [1, 2, 3]}
    ]
def test_constraint_manager_initialization(sample_constraints):
    cm = ConstraintManager(sample_constraints)
    assert len(cm.teachers) == 2
    assert len(cm.courses) == 2
    assert len(cm.rooms) == 2
    assert len(cm.classes) == 2
    assert cm.teacher_metadata['T1']['max_hours'] == 20
    assert cm.teacher_metadata['T2']['is_visiting'] is True
def test_constraint_manager_conflict_detection(sample_constraints):
    cm = ConstraintManager(sample_constraints)
    timetable = {'monday': {1: {'teacher_id': 'T1','course_id': 'C1','room_id': 'R1','class_id': 'Class1','room_type': 'classroom'},2: {'teacher_id': 'T1','course_id': 'C2','room_id': 'R2','class_id': 'Class2','room_type': 'lab'}}}
    conflicts = cm.count_conflicts(timetable)
    assert conflicts['teacher'] == 1
def test_genetic_optimizer():
    model = TimetableModel(input_shape=(10, 50), num_constraints=7)
    ga = GeneticOptimizer(pop_size=10)
    input_data = np.random.rand(10, 50)
    cm = ConstraintManager([])
    weights = ga.optimize(model, input_data, cm, generations=2)
    assert len(weights) == len(model.get_weights())
def test_nn_model_forward_pass():
    model = TimetableModel(input_shape=(10, 50), num_constraints=7)
    input_data = np.random.rand(1, 50)
    output = model(input_data)
    assert output.shape == (1, 50)
def test_generate_timetable_integration(sample_constraints):
    timetable, metrics = generate_timetable(sample_constraints)
    assert isinstance(timetable, dict)
    assert 'monday' in timetable
    assert isinstance(metrics, dict)
    assert 'conflicts' in metrics
    assert 'satisfaction' in metrics
def test_visiting_faculty_constraint():
    constraints = [{'teacher_id': 'VT1','course_id': 'C1','room_id': 'R1','class_id': 'Class1','timeslot': 1,'room_type': 'classroom','max_hours': 10,'max_consecutive': 2,'is_visiting': True,'availability': [1, 2]}]
    cm = ConstraintManager(constraints)
    timetable = {'monday': {3: {'teacher_id': 'VT1','course_id': 'C1','room_id': 'R1','class_id': 'Class1','room_type': 'classroom'}}}
    conflicts = cm.count_conflicts(timetable)
    assert conflicts['visiting'] == 1
def test_room_type_constraint():
    constraints = [{'teacher_id': 'T1','course_id': 'Lab1','room_id': 'R1','class_id': 'Class1','timeslot': 1,'room_type': 'lab','max_hours': 20,'max_consecutive': 3,'is_visiting': False,'availability': []}]
    cm = ConstraintManager(constraints)
    timetable = {'monday': {1: {'teacher_id': 'T1','course_id': 'Lab1','room_id': 'R1','class_id': 'Class1','room_type': 'classroom'}}}
    conflicts = cm.count_conflicts(timetable)
    assert conflicts['room_type'] == 1
