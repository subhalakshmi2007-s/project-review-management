"""
Student management (teacher-only)
  GET    /api/students          – list all students under this teacher
  GET    /api/students/<id>     – single student with their reviews
  POST   /api/students          – add a student manually (teacher sets password)
  PUT    /api/students/<id>     – update name / email / password
  DELETE /api/students/<id>     – remove student
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash
from app.extensions import db
from app.models import User, Review, Mark, Submission

students_bp = Blueprint('students', __name__)


def _teacher():
    user = User.query.get(int(get_jwt_identity()))
    if not user or user.role != 'teacher':
        return None
    return user


# ── List students ─────────────────────────────────────────────────────────────
@students_bp.route('', methods=['GET'])
@jwt_required()
def list_students():
    teacher = _teacher()
    if not teacher:
        return jsonify(error='Teacher access required'), 403

    # Students who registered with this teacher's join code
    students = User.query.filter_by(role='student', join_code=teacher.join_code).order_by(User.name).all()
    return jsonify([s.to_dict() for s in students]), 200


# ── Single student detail ─────────────────────────────────────────────────────
@students_bp.route('/<int:sid>', methods=['GET'])
@jwt_required()
def get_student(sid):
    teacher = _teacher()
    if not teacher:
        return jsonify(error='Teacher access required'), 403

    student = User.query.get_or_404(sid)
    if student.role != 'student' or student.join_code != teacher.join_code:
        return jsonify(error='Student not found'), 404

    reviews = Review.query.filter_by(teacher_id=teacher.id, student_id=sid).all()
    data = student.to_dict()
    data['reviews'] = [r.to_dict() for r in reviews]
    return jsonify(data), 200


# ── Add student manually ──────────────────────────────────────────────────────
@students_bp.route('', methods=['POST'])
@jwt_required()
def add_student():
    teacher = _teacher()
    if not teacher:
        return jsonify(error='Teacher access required'), 403

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

    student = User(
        name=name,
        email=email,
        password=generate_password_hash(password),
        role='student',
        join_code=teacher.join_code,
    )
    db.session.add(student)
    db.session.commit()
    return jsonify(message='Student added', student=student.to_dict()), 201


# ── Update student (name and email only — teacher cannot change passwords) ────
@students_bp.route('/<int:sid>', methods=['PUT'])
@jwt_required()
def update_student(sid):
    teacher = _teacher()
    if not teacher:
        return jsonify(error='Teacher access required'), 403

    student = User.query.get_or_404(sid)
    if student.role != 'student' or student.join_code != teacher.join_code:
        return jsonify(error='Student not found'), 404

    d = request.get_json(silent=True) or {}
    if d.get('name'):
        student.name = d['name'].strip()
    if d.get('email'):
        new_email = d['email'].strip().lower()
        conflict = User.query.filter_by(email=new_email).first()
        if conflict and conflict.id != sid:
            return jsonify(error='Email already in use'), 409
        student.email = new_email
    # Password changes are intentionally NOT allowed here.
    # Students manage their own passwords.

    db.session.commit()
    return jsonify(message='Student updated', student=student.to_dict()), 200


# ── Delete student ────────────────────────────────────────────────────────────
@students_bp.route('/<int:sid>', methods=['DELETE'])
@jwt_required()
def delete_student(sid):
    teacher = _teacher()
    if not teacher:
        return jsonify(error='Teacher access required'), 403

    student = User.query.get_or_404(sid)
    if student.role != 'student' or student.join_code != teacher.join_code:
        return jsonify(error='Student not found'), 404

    db.session.delete(student)
    db.session.commit()
    return jsonify(message='Student deleted'), 200
