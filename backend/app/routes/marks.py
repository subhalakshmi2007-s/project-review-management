"""
Marks management
  Teacher
    POST /api/marks/<review_id>   – assign / update marks & feedback
    GET  /api/marks/summary       – all marks across all teacher's reviews

  Student
    GET  /api/marks/mine          – my marks
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models import User, Review, Mark, Submission

marks_bp = Blueprint('marks', __name__)


def _me():
    return User.query.get(int(get_jwt_identity()))


# ── Teacher: assign / update marks ───────────────────────────────────────────
@marks_bp.route('/<int:rid>', methods=['POST'])
@jwt_required()
def assign_marks(rid):
    user = _me()
    if user.role != 'teacher':
        return jsonify(error='Teacher access required'), 403

    review = Review.query.get_or_404(rid)
    if review.teacher_id != user.id:
        return jsonify(error='Not your review'), 403
    if not review.submission:
        return jsonify(error='Student has not submitted yet'), 400

    d = request.get_json(silent=True) or {}
    marks_obtained = d.get('marks_obtained')
    feedback       = (d.get('feedback') or '').strip()

    if marks_obtained is None:
        return jsonify(error='marks_obtained is required'), 400

    marks_obtained = float(marks_obtained)
    if marks_obtained < 0 or marks_obtained > review.total_marks:
        return jsonify(error=f'Marks must be between 0 and {review.total_marks}'), 400

    existing = review.mark
    if existing:
        existing.marks_obtained = marks_obtained
        existing.feedback       = feedback
        db.session.commit()
        return jsonify(message='Marks updated', mark=existing.to_dict()), 200

    mark = Mark(
        review_id=rid,
        student_id=review.student_id,
        marks_obtained=marks_obtained,
        feedback=feedback,
    )
    db.session.add(mark)
    db.session.commit()
    return jsonify(message='Marks assigned', mark=mark.to_dict()), 201


# ── Teacher: full marks summary ───────────────────────────────────────────────
@marks_bp.route('/summary', methods=['GET'])
@jwt_required()
def summary():
    user = _me()
    if user.role != 'teacher':
        return jsonify(error='Teacher access required'), 403

    reviews = Review.query.filter_by(teacher_id=user.id).order_by(Review.student_id, Review.review_number).all()
    return jsonify([r.to_dict() for r in reviews]), 200


# ── Student: my marks ─────────────────────────────────────────────────────────
@marks_bp.route('/mine', methods=['GET'])
@jwt_required()
def my_marks():
    user = _me()
    if user.role != 'student':
        return jsonify(error='Student access required'), 403

    marks = Mark.query.filter_by(student_id=user.id).all()
    return jsonify([m.to_dict() for m in marks]), 200
