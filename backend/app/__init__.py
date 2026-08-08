import os
from datetime import timedelta
from flask import Flask
from flask_cors import CORS
from app.extensions import db, jwt


def create_app():
    app = Flask(__name__)

    # ── Config (reads from environment variables on Render) ──────────────────
    base_dir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))

    app.config['SQLALCHEMY_DATABASE_URI']        = os.environ.get(
        'DATABASE_URL',
        f"sqlite:///{os.path.join(base_dir, 'instance', 'prms.db')}"
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY']                     = os.environ.get('SECRET_KEY', 'prms-secret-2024')
    app.config['JWT_SECRET_KEY']                 = os.environ.get('JWT_SECRET_KEY', 'prms-jwt-secret-2024')
    app.config['JWT_ACCESS_TOKEN_EXPIRES']       = timedelta(hours=12)
    app.config['UPLOAD_FOLDER']                  = os.path.join(base_dir, 'uploads')
    app.config['MAX_CONTENT_LENGTH']             = 16 * 1024 * 1024   # 16 MB

    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(os.path.join(base_dir, 'instance'), exist_ok=True)

    # ── Extensions ──────────────────────────────────────────────────────────
    db.init_app(app)
    jwt.init_app(app)

    # Allow both localhost (dev) and the deployed frontend URL (prod)
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    CORS(app,
         resources={r'/api/*': {'origins': [frontend_url, 'http://localhost:3000']}},
         supports_credentials=True)

    # ── Blueprints ──────────────────────────────────────────────────────────
    from app.routes.auth          import auth_bp
    from app.routes.students      import students_bp
    from app.routes.reviews       import reviews_bp
    from app.routes.marks         import marks_bp
    from app.routes.announcements import ann_bp

    app.register_blueprint(auth_bp,     url_prefix='/api/auth')
    app.register_blueprint(students_bp, url_prefix='/api/students')
    app.register_blueprint(reviews_bp,  url_prefix='/api/reviews')
    app.register_blueprint(marks_bp,    url_prefix='/api/marks')
    app.register_blueprint(ann_bp,      url_prefix='/api/announcements')

    # ── Create tables ────────────────────────────────────────────────────────
    with app.app_context():
        db.create_all()

    return app
