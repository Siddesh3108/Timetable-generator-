import pytest
from app.ai_engine.constraint_manager import ConstraintManager

# Mock classes to simulate SQLAlchemy models without DB dependency
class MockTeacher:
    def __init__(self, id, name, is_visiting=False, availability=None):
        self.id = id
        self.name = name
        self.is_visiting = is_visiting
        self.availability = availability

class MockRoom:
    def __init__(self, id, name, room_type='Classroom'):
        self.id = id
        self.name = name
        self.room_type = room_type

class MockSubject:
    def __init__(self, id, name, requires_lab=False):
        self.id = id
        self.name = name
        self.requires_lab = requires_lab

@pytest.fixture
def empty_grid():
    """Provides an empty timetable grid for testing additions."""
    days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    timeslots = list(range(9, 18))
    return {day: {str(time): [] for time in timeslots} for day in days}

@pytest.fixture
def sample_data():
    """Provides sample teachers, rooms, and subjects for tests."""
    teachers = [
        MockTeacher(1, 'Prof. Smith'),
        MockTeacher(2, 'Dr. Jones'),
        MockTeacher(3, 'Dr. Visitor', is_visiting=True, availability={
            'days': ['tuesday', 'thursday'], 'from': '10:00', 'to': '14:00'
        })
    ]
    rooms = [
        MockRoom(1, 'R101', 'Classroom'),
        MockRoom(2, 'L202', 'Lab'),
        MockRoom(3, 'R102', 'Classroom')
    ]
    subjects = [
        MockSubject(1, 'History 101'),
        MockSubject(2, 'Chemistry Lab', requires_lab=True)
    ]
    return teachers, rooms, subjects

def test_no_conflicts(empty_grid, sample_data):
    """Test that a valid event added to an empty slot has zero conflicts."""
    teachers, rooms, subjects = sample_data
    cm = ConstraintManager(teachers, rooms, subjects)
    event = {
        'subject': subjects[0], 'teacher': teachers[0], 'room': rooms[0],
        'day': 'monday', 'time': '10'
    }
    assert cm.check_event_conflicts(event, empty_grid) == 0

def test_teacher_conflict(empty_grid, sample_data):
    """Test conflict when the same teacher is booked in the same slot."""
    teachers, rooms, subjects = sample_data
    cm = ConstraintManager(teachers, rooms, subjects)
    
    # Pre-populate the grid with an existing event
    existing_event = {
        'id': '1', 'subject': subjects[0], 'teacher': teachers[0], 'room': rooms[0],
        'day': 'monday', 'time': '11'
    }
    empty_grid['monday']['11'].append(existing_event)

    # Event to add that conflicts
    conflicting_event = {
        'subject': subjects[1], 'teacher': teachers[0], 'room': rooms[2], # Same Teacher, different room
        'day': 'monday', 'time': '11'
    }
    assert cm.check_event_conflicts(conflicting_event, empty_grid) == 1

def test_room_conflict(empty_grid, sample_data):
    """Test conflict when the same room is booked in the same slot."""
    teachers, rooms, subjects = sample_data
    cm = ConstraintManager(teachers, rooms, subjects)
    
    existing_event = {
        'id': '1', 'subject': subjects[0], 'teacher': teachers[0], 'room': rooms[1],
        'day': 'tuesday', 'time': '9'
    }
    empty_grid['tuesday']['9'].append(existing_event)

    conflicting_event = {
        'subject': subjects[1], 'teacher': teachers[1], 'room': rooms[1], # Same Room, different teacher
        'day': 'tuesday', 'time': '9'
    }
    assert cm.check_event_conflicts(conflicting_event, empty_grid) == 1

def test_lab_mismatch_conflict(empty_grid, sample_data):
    """Test conflict when a lab subject is scheduled in a regular classroom."""
    teachers, rooms, subjects = sample_data
    cm = ConstraintManager(teachers, rooms, subjects)
    
    # Lab subject in a non-lab room
    event = {
        'subject': subjects[1], # Chemistry Lab (requires_lab=True)
        'teacher': teachers[1],
        'room': rooms[0], # R101 (Classroom)
        'day': 'wednesday', 'time': '14'
    }
    assert cm.check_event_conflicts(event, empty_grid) == 1

def test_lab_mismatch_no_conflict(empty_grid, sample_data):
    """Test no conflict when a lab subject is in a lab room."""
    teachers, rooms, subjects = sample_data
    cm = ConstraintManager(teachers, rooms, subjects)
    
    event = {
        'subject': subjects[1], # Chemistry Lab
        'teacher': teachers[1],
        'room': rooms[1], # L202 (Lab)
        'day': 'wednesday', 'time': '14'
    }
    assert cm.check_event_conflicts(event, empty_grid) == 0

def test_visiting_faculty_availability_conflict_day(empty_grid, sample_data):
    """Test conflict when a visiting teacher is scheduled on an unavailable day."""
    teachers, rooms, subjects = sample_data
    cm = ConstraintManager(teachers, rooms, subjects)
    
    # Dr. Visitor is only available on Tue/Thu
    event = {
        'subject': subjects[0],
        'teacher': teachers[2], # Dr. Visitor
        'room': rooms[0],
        'day': 'friday', # Wrong day
        'time': '11'
    }
    assert cm.check_event_conflicts(event, empty_grid) == 1

def test_visiting_faculty_availability_conflict_time(empty_grid, sample_data):
    """Test conflict when a visiting teacher is scheduled at an unavailable time."""
    teachers, rooms, subjects = sample_data
    cm = ConstraintManager(teachers, rooms, subjects)
    
    # Dr. Visitor is only available from 10:00 to 14:00
    event = {
        'subject': subjects[0],
        'teacher': teachers[2], # Dr. Visitor
        'room': rooms[0],
        'day': 'tuesday',
        'time': '15' # Wrong time (available until 14:00)
    }
    assert cm.check_event_conflicts(event, empty_grid) == 1

def test_visiting_faculty_no_conflict(empty_grid, sample_data):
    """Test no conflict when a visiting teacher is scheduled within their availability."""
    teachers, rooms, subjects = sample_data
    cm = ConstraintManager(teachers, rooms, subjects)
    
    event = {
        'subject': subjects[0],
        'teacher': teachers[2], # Dr. Visitor
        'room': rooms[0],
        'day': 'tuesday', # Correct day
        'time': '12'      # Correct time
    }
    assert cm.check_event_conflicts(event, empty_grid) == 0
