import os
from datetime import timedelta
from flask import Flask, send_from_directory
from flask_cors import CORS
from app.extensions import db, jwt


def create_app():
    app = Flask(__name__)

    # Paths
    backend_dir = os.path.abspath(
        os.path.dirname(os.path.dirname(__file__))
    )

    repo_root = os.path.abspath(
        os.path.join(backend_dir, '..')
    )

    frontend_build = os.path.join(
        repo_root,
        'frontend',
        'build'
    )

    # Config
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'DATABASE_URL',
        f"sqlite:///{os.path.join(backend_dir, 'instance', 'prms.db')}"
    )

    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    app.config['SECRET_KEY'] = os.environ.get(
        'SECRET_KEY',
        'prms-secret-2024'
    )

    app.config['JWT_SECRET_KEY'] = os.environ.get(
        'JWT_SECRET_KEY',
        'prms-jwt-secret-2024'
    )

    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=12)

    app.config['UPLOAD_FOLDER'] = os.path.join(
        backend_dir,
        'uploads'
    )

    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

    app.config['FRONTEND_BUILD'] = frontend_build

    os.makedirs(
        app.config['UPLOAD_FOLDER'],
        exist_ok=True
    )

    os.makedirs(
        os.path.join(backend_dir, 'instance'),
        exist_ok=True
    )

    # Extensions
    db.init_app(app)
    jwt.init_app(app)

    CORS(
        app,
        resources={r'/api/*': {'origins': '*'}},
        supports_credentials=True
    )

    # API Blueprints
    from app.routes.auth import auth_bp
    from app.routes.students import students_bp
    from app.routes.reviews import reviews_bp
    from app.routes.marks import marks_bp
    from app.routes.announcements import ann_bp

    app.register_blueprint(
        auth_bp,
        url_prefix='/api/auth'
    )

    app.register_blueprint(
        students_bp,
        url_prefix='/api/students'
    )

    app.register_blueprint(
        reviews_bp,
        url_prefix='/api/reviews'
    )

    app.register_blueprint(
        marks_bp,
        url_prefix='/api/marks'
    )

    app.register_blueprint(
        ann_bp,
        url_prefix='/api/announcements'
    )

    # Serve React static files
    @app.route('/static/<path:filename>')
    def serve_static(filename):
        build = app.config['FRONTEND_BUILD']

        return send_from_directory(
            os.path.join(build, 'static'),
            filename
        )

    # Serve React application
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react(path):
        build = app.config['FRONTEND_BUILD']

        full_path = os.path.join(build, path)

        if path and os.path.isfile(full_path):
            return send_from_directory(
                build,
                path
            )

        return send_from_directory(
            build,
            'index.html'
        )

    # Create database tables
    with app.app_context():
        db.create_all()

    return app