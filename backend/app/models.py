from .extensions import db, bcrypt
from flask_login import UserMixin
from sqlalchemy.dialects.postgresql import JSONB
class User(UserMixin, db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    def set_password(self, password): self.password_hash = bcrypt.generate_password_hash(password).decode('utf8')
    def check_password(self, password): return bcrypt.check_password_hash(self.password_hash, password)
class Teacher(db.Model):
    __tablename__ = 'teachers'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    subject_taught = db.Column(db.String(255))
    classes_taught = db.Column(db.String(255))
    max_lectures_per_day = db.Column(db.Integer)
    lecture_type = db.Column(db.String(50))
    theory_hours_per_week = db.Column(db.Integer)
    lab_hours_per_week = db.Column(db.Integer)
    is_visiting = db.Column(db.Boolean, default=False)
    availability = db.Column(JSONB)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('teachers', lazy=True, cascade="all, delete-orphan"))
class Room(db.Model):
    __tablename__ = 'rooms'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    room_type = db.Column(db.String(50))
    capacity = db.Column(db.Integer)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('rooms', lazy=True, cascade="all, delete-orphan"))
class Subject(db.Model):
    __tablename__ = 'subjects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    code = db.Column(db.String(20), nullable=False)
    requires_lab = db.Column(db.Boolean, default=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('subjects', lazy=True, cascade="all, delete-orphan"))
