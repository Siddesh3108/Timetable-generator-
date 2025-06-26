from flask import Blueprint, request, jsonify
from .extensions import db, bcrypt
from .models import User
from flask_login import login_user, logout_user, login_required, current_user
auth_bp = Blueprint('auth_routes', __name__)
@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing email or password'}), 400
    user_exists = User.query.filter_by(email=data.get('email')).first()
    if user_exists:
        return jsonify({'error': 'Email address already registered'}), 409
    username = data.get('username', data.get('email').split('@')[0])
    new_user = User(username=username, email=data.get('email'))
    new_user.set_password(data.get('password'))
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': f"User {new_user.username} created successfully"}), 201
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing email or password'}), 400
    user = User.query.filter_by(email=data.get('email')).first()
    if user and user.check_password(data.get('password')):
        login_user(user, remember=True)
        return jsonify({'status': 'success', 'user': {'username': user.username, 'email': user.email}}), 200
    return jsonify({'error': 'Invalid email or password'}), 401
@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'status': 'success', 'message': 'You have been logged out.'}), 200
@auth_bp.route('/session')
@login_required
def session():
    return jsonify({
        'status': 'success',
        'user': {
            'username': current_user.username,
            'email': current_user.email
        }
    }), 200

@auth_bp.route('/account', methods=['DELETE'])
@login_required
def delete_account():
    """Permanently deletes the current user and all their data."""
    user_to_delete = User.query.get(current_user.id)
    
    if user_to_delete:
        # Important: Log the user out of the session before deleting from the DB
        logout_user()
        db.session.delete(user_to_delete)
        db.session.commit()
        return jsonify({'status': 'success', 'message': 'Account permanently deleted.'}), 200
        
    return jsonify({'error': 'User not found.'}), 404
