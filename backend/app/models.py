from .extensions import db, bcrypt
from flask_login import UserMixin
from sqlalchemy.dialects.postgresql import JSONB

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    
    # Default: Monday-Friday (0-4), 9 AM to 5 PM (17:00)
    # The corrected code block for models.py
    settings = db.Column(JSONB, nullable=False, default=lambda:
    {
        "working_days": [0, 1, 2, 3, 4],
        "time_slots": [
            { "label": "9:00-9:50", "is_break": False },    # Changed from false
            { "label": "10:00-10:50", "is_break": False },   # Changed from false
            { "label": "11:00-12:30", "is_break": True, "name": "Lunch Break" },  # Changed from true
            { "label": "12:30-13:20", "is_break": False }    # Changed from false
        ]
    })

    def set_password(self, password): self.password_hash = bcrypt.generate_password_hash(password).decode('utf8')
    def check_password(self, password): return bcrypt.check_password_hash(self.password_hash, password)

class Teacher(db.Model):
    __tablename__ = 'teachers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    # The fields below are now for reference/defaults, the new 'Course' model will be the source of truth for scheduling
    subject_taught = db.Column(db.String(255))
    max_lectures_per_day = db.Column(db.Integer, default=4)
    is_visiting = db.Column(db.Boolean, default=False)
    availability = db.Column(JSONB)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('teachers', lazy=True, cascade="all, delete-orphan"))

class Room(db.Model):
    __tablename__ = 'rooms'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    room_type = db.Column(db.String(50)) # e.g., 'Classroom', 'Laboratory'
    capacity = db.Column(db.Integer)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('rooms', lazy=True, cascade="all, delete-orphan"))

class Subject(db.Model):
    __tablename__ = 'subjects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), nullable=False)
    
    # --- REPLACED a single lectures_per_week and is_lab ---
    # With two separate fields for clarity and power.
    theory_lectures_per_week = db.Column(db.Integer, default=0)
    lab_sessions_per_week = db.Column(db.Integer, default=0) # Note: 1 session = a 2-hour block
    # --- END OF CHANGES ---

    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('subjects', lazy=True, cascade="all, delete-orphan"))

# --- NEW DATABASE MODELS ---

class Division(db.Model):
    """Represents a class or department, e.g., 'Computer Engineering, Year 3'."""
    __tablename__ = 'divisions'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False) # e.g., "Third Year Comp Eng"
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('divisions', lazy=True, cascade="all, delete-orphan"))
    # A division can have multiple batches (e.g., B1, B2)
    batches = db.relationship('Batch', backref='division', lazy='dynamic', cascade="all, delete-orphan")

class Batch(db.Model):
    """Represents a group of students within a Division. e.g., 'B1', 'B2', or 'Whole Class'."""
    __tablename__ = 'batches'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False) # e.g., "B1" or "All"
    division_id = db.Column(db.Integer, db.ForeignKey('divisions.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('batches', lazy=True, cascade="all, delete-orphan"))

class Course(db.Model):
    """
    This is the core mapping. It links a Subject to a Teacher for a specific Batch.
    e.g., Subject 'CS' is taught by Teacher 'PGB' to Batch 'B1'.
    """
    __tablename__ = 'courses'
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('teachers.id'), nullable=False)
    batch_id = db.Column(db.Integer, db.ForeignKey('batches.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    user = db.relationship('User', backref=db.backref('courses', lazy=True, cascade="all, delete-orphan"))
    subject = db.relationship('Subject', backref='courses')
    teacher = db.relationship('Teacher', backref='courses')
    batch = db.relationship('Batch', backref='courses')