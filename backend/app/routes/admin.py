from datetime import date, timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import Announcement, Mark, Review, Submission, User

admin_bp = Blueprint('admin', __name__)


def _admin_user():
    user = User.query.get(int(get_jwt_identity()))
    return user if user and user.role == 'admin' else None


@admin_bp.route('/overview', methods=['GET'])
@jwt_required()
def overview():
    if not _admin_user():
        return jsonify(error='Admin access required'), 403

    users = User.query.order_by(User.created_at.desc()).all()
    today = date.today()
    start_value = request.args.get('start_date')
    end_value = request.args.get('end_date')
    try:
        start_date = date.fromisoformat(start_value) if start_value else today - timedelta(days=13)
        end_date = date.fromisoformat(end_value) if end_value else today
    except ValueError:
        return jsonify(error='Dates must use YYYY-MM-DD format'), 400
    if start_date > end_date:
        return jsonify(error='Start date must be before or equal to end date'), 400
    if (end_date - start_date).days > 366:
        return jsonify(error='Date range cannot exceed one year'), 400

    registration_trend = []
    day = start_date
    while day <= end_date:
        day_users = [user for user in users if user.created_at.date() == day]
        registration_trend.append({
            'date': day.isoformat(),
            'users': len(day_users),
            'teachers': sum(user.role == 'teacher' for user in day_users),
            'students': sum(user.role == 'student' for user in day_users),
        })
        day += timedelta(days=1)

    return jsonify(
        site={
            'name': 'ProReview',
            'description': 'Project Review Management System',
            'registration': 'Teachers create classes; students join with a teacher join code.',
        },
        counts={
            'users': User.query.count(),
            'teachers': User.query.filter_by(role='teacher').count(),
            'students': User.query.filter_by(role='student').count(),
            'reviews': Review.query.count(),
            'submissions': Submission.query.count(),
            'announcements': Announcement.query.count(),
        },
        recent_users=[user.to_dict() for user in users[:8]],
        accounts=[user.to_dict() for user in users if user.role != 'admin'],
        registration_trend=registration_trend,
    ), 200


@admin_bp.route('/results', methods=['GET'])
@jwt_required()
def results():
    if not _admin_user():
        return jsonify(error='Admin access required'), 403

    reviews = Review.query.order_by(Review.student_id, Review.review_number).all()
    students = User.query.filter_by(role='student').order_by(User.name).all()
    return jsonify(
        reviews=[review.to_dict() for review in reviews],
        students=[student.to_dict() for student in students],
    ), 200


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    if not _admin_user():
        return jsonify(error='Admin access required'), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify(error='User not found'), 404
    if user.role == 'admin':
        return jsonify(error='Administrator accounts cannot be deleted here'), 400

    reviews = Review.query.filter(
        (Review.teacher_id == user.id) | (Review.student_id == user.id)
    ).all()
    review_ids = [review.id for review in reviews]
    if review_ids:
        Submission.query.filter(Submission.review_id.in_(review_ids)).delete(synchronize_session=False)
        Mark.query.filter(Mark.review_id.in_(review_ids)).delete(synchronize_session=False)
        Review.query.filter(Review.id.in_(review_ids)).delete(synchronize_session=False)

    Announcement.query.filter_by(teacher_id=user.id).delete(synchronize_session=False)
    db.session.delete(user)
    db.session.commit()
    return jsonify(message=f'{user.role.title()} account deleted'), 200