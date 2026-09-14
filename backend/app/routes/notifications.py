from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models import User, Notification

notifications_bp = Blueprint('notifications', __name__)


def _me():
    return User.query.get(int(get_jwt_identity()))


@notifications_bp.route('', methods=['GET'])
@jwt_required()
def list_notifications():
    user = _me()
    items = Notification.query.filter_by(recipient_id=user.id) \
        .order_by(Notification.created_at.desc()).limit(40).all()
    return jsonify({
        'items': [item.to_dict() for item in items],
        'unread': sum(not item.is_read for item in items),
    }), 200


@notifications_bp.route('/<int:nid>/read', methods=['PATCH'])
@jwt_required()
def mark_read(nid):
    user = _me()
    item = Notification.query.get_or_404(nid)
    if item.recipient_id != user.id:
        return jsonify(error='Notification not found'), 404
    item.is_read = True
    db.session.commit()
    return jsonify(item=item.to_dict()), 200


@notifications_bp.route('/read-all', methods=['PATCH'])
@jwt_required()
def mark_all_read():
    user = _me()
    Notification.query.filter_by(recipient_id=user.id, is_read=False).update({'is_read': True})
    db.session.commit()
    return jsonify(message='Notifications marked as read'), 200