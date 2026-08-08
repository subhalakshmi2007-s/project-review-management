"""
Review management
  Teacher
    GET    /api/reviews               – all reviews created by teacher
    POST   /api/reviews               – create review for a student
    PUT    /api/reviews/<id>          – update review details
    DELETE /api/reviews/<id>          – delete review
    GET    /api/reviews/<id>/submission – view student's submission

  Student
    GET    /api/reviews/mine          – my assigned reviews
    POST   /api/reviews/<id>/submit   – submit task note + PDF
    GET    /api/reviews/uploads/<fn>  – download submitted PDF
"""
import os
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from app.extensions import db
from app.models import User, Review, Submission
from app.utils.helpers import allowed_pdf

reviews_bp = Blueprint('reviews', __name__)


def _me():
    return User.query.get(int(get_jwt_identity()))


# ── Teacher: list all their reviews ──────────────────────────────────────────
@reviews_bp.route('', methods=['GET'])
@jwt_required()
def list_reviews():
    user = _me()
    if user.role != 'teacher':
        return jsonify(error='Teacher access required'), 403
    reviews = Review.query.filter_by(teacher_id=user.id).order_by(Review.created_at.desc()).all()
    return jsonify([r.to_dict() for r in reviews]), 200


# ── Teacher: create review ────────────────────────────────────────────────────
@reviews_bp.route('', methods=['POST'])
@jwt_required()
def create_review():
    user = _me()
    if user.role != 'teacher':
        return jsonify(error='Teacher access required'), 403

    d = request.get_json(silent=True) or {}
    title         = (d.get('title') or '').strip()
    description   = (d.get('description') or '').strip()
    review_number = d.get('review_number')
    total_marks   = d.get('total_marks')
    deadline      = d.get('deadline')
    student_id    = d.get('student_id')

    if not all([title, description, review_number, total_marks, deadline, student_id]):
        return jsonify(error='All fields are required'), 400

    student = User.query.get(student_id)
    if not student or student.role != 'student' or student.join_code != user.join_code:
        return jsonify(error='Student not found'), 404

    try:
        dl = datetime.fromisoformat(deadline)
    except ValueError:
        return jsonify(error='Invalid deadline format (use ISO 8601)'), 400

    review = Review(
        title=title,
        description=description,
        review_number=int(review_number),
        total_marks=float(total_marks),
        deadline=dl,
        teacher_id=user.id,
        student_id=student_id,
    )
    db.session.add(review)
    db.session.commit()
    return jsonify(message='Review created', review=review.to_dict()), 201


# ── Teacher: update review ────────────────────────────────────────────────────
@reviews_bp.route('/<int:rid>', methods=['PUT'])
@jwt_required()
def update_review(rid):
    user = _me()
    if user.role != 'teacher':
        return jsonify(error='Teacher access required'), 403

    review = Review.query.get_or_404(rid)
    if review.teacher_id != user.id:
        return jsonify(error='Not your review'), 403

    d = request.get_json(silent=True) or {}
    if d.get('title'):
        review.title = d['title'].strip()
    if d.get('description'):
        review.description = d['description'].strip()
    if d.get('review_number') is not None:
        review.review_number = int(d['review_number'])
    if d.get('total_marks') is not None:
        review.total_marks = float(d['total_marks'])
    if d.get('deadline'):
        try:
            review.deadline = datetime.fromisoformat(d['deadline'])
        except ValueError:
            return jsonify(error='Invalid deadline format'), 400

    db.session.commit()
    return jsonify(message='Review updated', review=review.to_dict()), 200


# ── Teacher: delete review ────────────────────────────────────────────────────
@reviews_bp.route('/<int:rid>', methods=['DELETE'])
@jwt_required()
def delete_review(rid):
    user = _me()
    if user.role != 'teacher':
        return jsonify(error='Teacher access required'), 403

    review = Review.query.get_or_404(rid)
    if review.teacher_id != user.id:
        return jsonify(error='Not your review'), 403

    # Remove uploaded PDF if exists
    if review.submission and review.submission.pdf_file:
        path = os.path.join(current_app.config['UPLOAD_FOLDER'], review.submission.pdf_file)
        if os.path.exists(path):
            os.remove(path)

    db.session.delete(review)
    db.session.commit()
    return jsonify(message='Review deleted'), 200


# ── Teacher: view a student's submission for a review ─────────────────────────
@reviews_bp.route('/<int:rid>/submission', methods=['GET'])
@jwt_required()
def view_submission(rid):
    user = _me()
    if user.role != 'teacher':
        return jsonify(error='Teacher access required'), 403

    review = Review.query.get_or_404(rid)
    if review.teacher_id != user.id:
        return jsonify(error='Not your review'), 403

    sub = review.submission
    if not sub:
        return jsonify(error='No submission yet'), 404

    return jsonify({
        'id': sub.id,
        'student_name': review.student.name,
        'task_note': sub.task_note,
        'pdf_file': sub.pdf_file,
        'submitted_at': sub.submitted_at.isoformat(),
    }), 200


# ── Student: list my reviews ──────────────────────────────────────────────────
@reviews_bp.route('/mine', methods=['GET'])
@jwt_required()
def my_reviews():
    user = _me()
    if user.role != 'student':
        return jsonify(error='Student access required'), 403
    reviews = Review.query.filter_by(student_id=user.id).order_by(Review.review_number).all()
    return jsonify([r.to_dict() for r in reviews]), 200


# ── Student: submit review (PDF + task note) ──────────────────────────────────
@reviews_bp.route('/<int:rid>/submit', methods=['POST'])
@jwt_required()
def submit_review(rid):
    user = _me()
    if user.role != 'student':
        return jsonify(error='Student access required'), 403

    review = Review.query.get_or_404(rid)
    if review.student_id != user.id:
        return jsonify(error='This review is not assigned to you'), 403
    if review.submission:
        return jsonify(error='Already submitted'), 400

    if 'file' not in request.files:
        return jsonify(error='PDF file is required'), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify(error='No file selected'), 400
    if not allowed_pdf(file.filename):
        return jsonify(error='Only PDF files are allowed'), 400

    task_note = (request.form.get('task_note') or '').strip()

    # Save file with unique name
    safe_name = secure_filename(file.filename)
    filename  = f"u{user.id}_r{rid}_{safe_name}"
    file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], filename))

    sub = Submission(
        review_id=rid,
        student_id=user.id,
        task_note=task_note,
        pdf_file=filename,
    )
    db.session.add(sub)
    db.session.commit()
    return jsonify(message='Submitted successfully'), 201


# ── Serve uploaded PDF (both teacher and student can access) ──────────────────
@reviews_bp.route('/uploads/<path:filename>', methods=['GET'])
@jwt_required()
def serve_pdf(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)
