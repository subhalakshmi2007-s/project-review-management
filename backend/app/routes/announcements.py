"""
Announcements
  Teacher
    GET    /api/announcements        – list all (teacher sees own)
    POST   /api/announcements        – create
    PUT    /api/announcements/<id>   – edit
    DELETE /api/announcements/<id>   – delete

  Student
    GET    /api/announcements        – list all (students see their teacher's)
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models import User, Announcement

ann_bp = Blueprint('announcements', __name__)


def _me():
    return User.query.get(int(get_jwt_identity()))


# ── List announcements ────────────────────────────────────────────────────────
@ann_bp.route('', methods=['GET'])
@jwt_required()
def list_announcements():
    user = _me()

    if user.role == 'teacher':
        items = Announcement.query.filter_by(teacher_id=user.id).order_by(Announcement.created_at.desc()).all()
    else:
        # Find student's teacher via join_code
        teacher = User.query.filter_by(join_code=user.join_code, role='teacher').first()
        if not teacher:
            return jsonify([]), 200
        items = Announcement.query.filter_by(teacher_id=teacher.id).order_by(Announcement.created_at.desc()).all()

    return jsonify([a.to_dict() for a in items]), 200


# ── Create announcement ───────────────────────────────────────────────────────
@ann_bp.route('', methods=['POST'])
@jwt_required()
def create_announcement():
    user = _me()
    if user.role != 'teacher':
        return jsonify(error='Teacher access required'), 403

    d = request.get_json(silent=True) or {}
    title   = (d.get('title') or '').strip()
    content = (d.get('content') or '').strip()

    if not title or not content:
        return jsonify(error='Title and content are required'), 400

    ann = Announcement(title=title, content=content, teacher_id=user.id)
    db.session.add(ann)
    db.session.commit()
    return jsonify(message='Announcement created', announcement=ann.to_dict()), 201


# ── Update announcement ───────────────────────────────────────────────────────
@ann_bp.route('/<int:aid>', methods=['PUT'])
@jwt_required()
def update_announcement(aid):
    user = _me()
    if user.role != 'teacher':
        return jsonify(error='Teacher access required'), 403

    ann = Announcement.query.get_or_404(aid)
    if ann.teacher_id != user.id:
        return jsonify(error='Not your announcement'), 403

    d = request.get_json(silent=True) or {}
    if d.get('title'):
        ann.title = d['title'].strip()
    if d.get('content'):
        ann.content = d['content'].strip()

    db.session.commit()
    return jsonify(message='Announcement updated', announcement=ann.to_dict()), 200


# ── Delete announcement ───────────────────────────────────────────────────────
@ann_bp.route('/<int:aid>', methods=['DELETE'])
@jwt_required()
def delete_announcement(aid):
    user = _me()
    if user.role != 'teacher':
        return jsonify(error='Teacher access required'), 403

    ann = Announcement.query.get_or_404(aid)
    if ann.teacher_id != user.id:
        return jsonify(error='Not your announcement'), 403

    db.session.delete(ann)
    db.session.commit()
    return jsonify(message='Announcement deleted'), 200
