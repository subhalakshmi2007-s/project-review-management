"""
Authentication routes
  POST /api/auth/register-teacher  – teacher creates account (gets a join code)
  POST /api/auth/register-student  – student joins using teacher's join code
  POST /api/auth/login             – teacher or student login
  GET  /api/auth/me                – current user profile
  GET  /api/auth/join-code         – teacher: view their own join code
  POST /api/auth/refresh-code      – teacher: generate a new join code
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import db
from app.models import User
from app.utils.helpers import make_join_code

auth_bp = Blueprint('auth', __name__)


# ── helpers ──────────────────────────────────────────────────────────────────
def _current_user():
    return User.query.get(int(get_jwt_identity()))


def _token_for(user):
    return create_access_token(identity=str(user.id))


# ── Teacher registration ──────────────────────────────────────────────────────
@auth_bp.route('/register-teacher', methods=['POST'])
def register_teacher():
    d = request.get_json(silent=True) or {}
    name     = (d.get('name') or '').strip()
    email    = (d.get('email') or '').strip().lower()
    password = d.get('password') or ''

    if not name or not email or not password:
        return jsonify(error='Name, email and password are required'), 400
    if len(password) < 6:
        return jsonify(error='Password must be at least 6 characters'), 400
    if User.query.filter_by(email=email).first():
        return jsonify(error='Email already registered'), 409

    code = make_join_code()
    # Ensure code is unique
    while User.query.filter_by(join_code=code).first():
        code = make_join_code()

    teacher = User(
        name=name,
        email=email,
        password=generate_password_hash(password),
        role='teacher',
        join_code=code,
    )
    db.session.add(teacher)
    db.session.commit()

    return jsonify(
        message='Teacher account created',
        join_code=code,
        token=_token_for(teacher),
        user=teacher.to_dict(),
    ), 201


# ── Student registration (requires join code) ─────────────────────────────────
@auth_bp.route('/register-student', methods=['POST'])
def register_student():
    d = request.get_json(silent=True) or {}
    name      = (d.get('name') or '').strip()
    email     = (d.get('email') or '').strip().lower()
    password  = d.get('password') or ''
    join_code = (d.get('join_code') or '').strip().upper()

    if not name or not email or not password or not join_code:
        return jsonify(error='Name, email, password and join code are required'), 400
    if len(password) < 6:
        return jsonify(error='Password must be at least 6 characters'), 400

    # Verify join code belongs to a teacher
    teacher = User.query.filter_by(join_code=join_code, role='teacher').first()
    if not teacher:
        return jsonify(error='Invalid join code'), 400

    if User.query.filter_by(email=email).first():
        return jsonify(error='Email already registered'), 409

    student = User(
        name=name,
        email=email,
        password=generate_password_hash(password),
        role='student',
        join_code=join_code,   # store which teacher they belong to
    )
    db.session.add(student)
    db.session.commit()

    return jsonify(
        message='Student account created',
        token=_token_for(student),
        user=student.to_dict(),
    ), 201


# ── Login ─────────────────────────────────────────────────────────────────────
@auth_bp.route('/login', methods=['POST'])
def login():
    d = request.get_json(silent=True) or {}
    email    = (d.get('email') or '').strip().lower()
    password = d.get('password') or ''

    if not email or not password:
        return jsonify(error='Email and password required'), 400

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password, password):
        return jsonify(error='Invalid email or password'), 401

    return jsonify(token=_token_for(user), user=user.to_dict()), 200


# ── Current user ──────────────────────────────────────────────────────────────
@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    return jsonify(user=_current_user().to_dict()), 200


# ── Teacher: view join code ───────────────────────────────────────────────────
@auth_bp.route('/join-code', methods=['GET'])
@jwt_required()
def view_join_code():
    user = _current_user()
    if user.role != 'teacher':
        return jsonify(error='Teachers only'), 403
    return jsonify(join_code=user.join_code), 200


# ── Teacher: regenerate join code ────────────────────────────────────────────
@auth_bp.route('/refresh-code', methods=['POST'])
@jwt_required()
def refresh_code():
    user = _current_user()
    if user.role != 'teacher':
        return jsonify(error='Teachers only'), 403

    code = make_join_code()
    while User.query.filter_by(join_code=code).first():
        code = make_join_code()

    user.join_code = code
    db.session.commit()
    return jsonify(message='Join code refreshed', join_code=code), 200