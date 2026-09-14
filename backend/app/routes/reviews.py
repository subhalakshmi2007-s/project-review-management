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
from app.models import User, Review, Submission, Notification
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

    if user.role == 'teacher':
        d = request.get_json(silent=True) or {}
        review_number = d.get('review_number')
        deadline      = d.get('deadline')
        student_id    = d.get('student_id')
        total_marks   = d.get('total_marks')

        if review_number is None or not deadline:
            return jsonify(error='Review number and deadline are required'), 400

        try:
            dl = datetime.fromisoformat(deadline)
        except ValueError:
            return jsonify(error='Invalid deadline format (use ISO 8601)'), 400

        title = (d.get('title') or '').strip() or f"Review {review_number}"
        description = (d.get('description') or '').strip() or 'Student will provide the task details and PDF submission.'

        if total_marks in (None, ''):
            return jsonify(error='Total marks are required'), 400

        try:
            total_marks_value = float(total_marks)
        except (TypeError, ValueError):
            return jsonify(error='Invalid total marks value'), 400

        if total_marks_value <= 0:
            return jsonify(error='Total marks must be greater than 0'), 400

        if student_id in (None, '', 'all', 'all_students'):
            students = User.query.filter_by(role='student', join_code=user.join_code).order_by(User.name).all()
            if not students:
                return jsonify(error='No students are assigned to your class yet'), 400

            created = []
            for student in students:
                review = Review(
                    title=title,
                    description=description,
                    review_number=int(review_number),
                    total_marks=total_marks_value,
                    deadline=dl,
                    teacher_id=user.id,
                    student_id=student.id,
                )
                db.session.add(review)
                created.append(review)

            db.session.commit()
            return jsonify(message='Review created for all students', reviews=[r.to_dict() for r in created]), 201

        student = User.query.get(student_id)
        if not student or student.role != 'student' or student.join_code != user.join_code:
            return jsonify(error='Student not found'), 404

        review = Review(
            title=title,
            description=description,
            review_number=int(review_number),
            total_marks=total_marks_value,
            deadline=dl,
            teacher_id=user.id,
            student_id=student.id,
        )
        db.session.add(review)
        db.session.commit()
        return jsonify(message='Review created', review=review.to_dict()), 201

    if user.role != 'student':
        return jsonify(error='Access denied'), 403

    if 'file' not in request.files:
        return jsonify(error='PDF file is required'), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify(error='No file selected'), 400
    if not allowed_pdf(file.filename):
        return jsonify(error='Only PDF files are allowed'), 400

    review_number = (request.form.get('review_number') or '').strip()
    deadline = (request.form.get('deadline') or '').strip()
    title = (request.form.get('title') or '').strip()
    description = (request.form.get('description') or '').strip()
    task_note = (request.form.get('task_note') or '').strip()
    total_marks = request.form.get('total_marks')

    if not review_number or not deadline or not title or not description:
        return jsonify(error='Review number, date, title and description are required'), 400

    try:
        dl = datetime.fromisoformat(deadline)
    except ValueError:
        return jsonify(error='Invalid deadline format (use ISO 8601)'), 400

    teacher = User.query.filter_by(role='teacher', join_code=user.join_code).first()
    if not teacher:
        return jsonify(error='Your teacher is not available yet'), 404

    total_marks_value = None
    if total_marks not in (None, ''):
        try:
            total_marks_value = float(total_marks)
        except (TypeError, ValueError):
            return jsonify(error='Invalid total marks value'), 400
    # Ensure a non-null value for databases with NOT NULL constraint
    if total_marks_value is None:
        total_marks_value = 0.0

    review = Review(
        title=title,
        description=description,
        review_number=int(review_number),
        total_marks=total_marks_value,
        deadline=dl,
        teacher_id=teacher.id,
        student_id=user.id,
    )
    db.session.add(review)
    db.session.commit()

    safe_name = secure_filename(file.filename)
    filename = f"u{user.id}_r{review.id}_{safe_name}"
    file.save(os.path.join(current_app.config['UPLOAD_FOLDER'], filename))

    sub = Submission(
        review_id=review.id,
        student_id=user.id,
        task_note=task_note,
        pdf_file=filename,
    )
    db.session.add(sub)
    db.session.commit()
    return jsonify(message='Review submitted successfully', review=review.to_dict()), 201


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
    if review.mark:
        return jsonify(error='This review has already been marked and cannot be changed'), 400

    if 'file' not in request.files:
        return jsonify(error='PDF file is required'), 400

    file = request.files['file']
    if not file or file.filename == '':
        return jsonify(error='No file selected'), 400
    if not allowed_pdf(file.filename):
        return jsonify(error='Only PDF files are allowed'), 400

    title = (request.form.get('title') or '').strip()
    description = (request.form.get('description') or '').strip()
    task_note = (request.form.get('task_note') or '').strip()

    if title:
        review.title = title
    elif not review.title:
        review.title = f"Review {review.review_number}"

    if description:
        review.description = description
    elif not review.description:
        review.description = 'Student submission details provided with the PDF upload.'

    # Save file with unique name
    safe_name = secure_filename(file.filename)
    filename  = f"u{user.id}_r{rid}_{safe_name}"
    upload_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
    if review.submission and review.submission.pdf_file:
        old_path = os.path.join(current_app.config['UPLOAD_FOLDER'], review.submission.pdf_file)
        if os.path.exists(old_path):
            os.remove(old_path)

    file.save(upload_path)

    if review.submission:
        review.submission.task_note = task_note
        review.submission.pdf_file = filename
        review.submission.submitted_at = datetime.utcnow()
        db.session.add(review.submission)
        db.session.add(Notification(
            recipient_id=review.teacher_id,
            kind='review_submitted',
            title='Review resubmitted',
            message=f'{user.name} resubmitted "{review.title}".',
        ))
        db.session.commit()
        return jsonify(message='Submission updated successfully'), 200

    sub = Submission(
        review_id=rid,
        student_id=user.id,
        task_note=task_note,
        pdf_file=filename,
    )
    db.session.add(sub)
    db.session.add(Notification(
        recipient_id=review.teacher_id,
        kind='review_submitted',
        title='New review submission',
        message=f'{user.name} submitted "{review.title}".',
    ))
    db.session.commit()
    return jsonify(message='Submitted successfully'), 201


# ── Serve uploaded PDF (both teacher and student can access) ──────────────────
@reviews_bp.route('/uploads/<path:filename>', methods=['GET'])
@jwt_required()
def serve_pdf(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)
