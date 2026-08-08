from datetime import datetime
from app.extensions import db


class User(db.Model):
    __tablename__ = 'users'
    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(120), nullable=False)
    email      = db.Column(db.String(120), unique=True, nullable=False)
    password   = db.Column(db.String(256), nullable=False)
    role       = db.Column(db.String(10), nullable=False, default='student')  # teacher | student
    join_code  = db.Column(db.String(20), nullable=True)   # teacher's generated code (teacher row only)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # relationships
    reviews_created  = db.relationship('Review', foreign_keys='Review.teacher_id', backref='teacher', lazy=True, cascade='all, delete-orphan')
    reviews_assigned = db.relationship('Review', foreign_keys='Review.student_id', backref='student', lazy=True)
    submissions      = db.relationship('Submission', backref='student', lazy=True)
    marks            = db.relationship('Mark', backref='student', lazy=True)
    announcements    = db.relationship('Announcement', backref='teacher', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'join_code': self.join_code,
            'created_at': self.created_at.isoformat(),
        }


class Review(db.Model):
    __tablename__ = 'reviews'
    id             = db.Column(db.Integer, primary_key=True)
    title          = db.Column(db.String(200), nullable=False)
    description    = db.Column(db.Text, nullable=False)       # task instructions from teacher
    review_number  = db.Column(db.Integer, nullable=False)    # e.g. 1, 2, 3
    total_marks    = db.Column(db.Float, nullable=False)
    deadline       = db.Column(db.DateTime, nullable=False)
    teacher_id     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    student_id     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)

    submission = db.relationship('Submission', backref='review', uselist=False, cascade='all, delete-orphan')
    mark       = db.relationship('Mark',       backref='review', uselist=False, cascade='all, delete-orphan')

    def to_dict(self):
        sub  = self.submission
        mark = self.mark
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'review_number': self.review_number,
            'total_marks': self.total_marks,
            'deadline': self.deadline.isoformat(),
            'teacher_id': self.teacher_id,
            'teacher_name': self.teacher.name if self.teacher else '',
            'student_id': self.student_id,
            'student_name': self.student.name if self.student else '',
            'created_at': self.created_at.isoformat(),
            # submission info
            'submitted': sub is not None,
            'task_note': sub.task_note if sub else None,
            'pdf_file': sub.pdf_file if sub else None,
            'submitted_at': sub.submitted_at.isoformat() if sub else None,
            # marks info
            'marks_obtained': mark.marks_obtained if mark else None,
            'feedback': mark.feedback if mark else None,
            'marked_at': mark.created_at.isoformat() if mark else None,
            'status': _status(self),
        }


def _status(review):
    mark = review.mark
    sub  = review.submission
    if mark:
        return 'marked'
    if sub:
        return 'submitted'
    if review.deadline < datetime.utcnow():
        return 'overdue'
    return 'pending'


class Submission(db.Model):
    __tablename__ = 'submissions'
    id           = db.Column(db.Integer, primary_key=True)
    review_id    = db.Column(db.Integer, db.ForeignKey('reviews.id'), nullable=False)
    student_id   = db.Column(db.Integer, db.ForeignKey('users.id'),   nullable=False)
    task_note    = db.Column(db.Text, nullable=True)      # student's task description
    pdf_file     = db.Column(db.String(300), nullable=False)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)


class Mark(db.Model):
    __tablename__ = 'marks'
    id             = db.Column(db.Integer, primary_key=True)
    review_id      = db.Column(db.Integer, db.ForeignKey('reviews.id'), nullable=False)
    student_id     = db.Column(db.Integer, db.ForeignKey('users.id'),   nullable=False)
    marks_obtained = db.Column(db.Float, nullable=False)
    feedback       = db.Column(db.Text, nullable=True)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        r = self.review
        return {
            'id': self.id,
            'review_id': self.review_id,
            'review_title': r.title if r else '',
            'review_number': r.review_number if r else '',
            'total_marks': r.total_marks if r else 0,
            'marks_obtained': self.marks_obtained,
            'feedback': self.feedback,
            'created_at': self.created_at.isoformat(),
        }


class Announcement(db.Model):
    __tablename__ = 'announcements'
    id         = db.Column(db.Integer, primary_key=True)
    title      = db.Column(db.String(200), nullable=False)
    content    = db.Column(db.Text, nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'teacher_name': self.teacher.name if self.teacher else '',
            'created_at': self.created_at.isoformat(),
        }
