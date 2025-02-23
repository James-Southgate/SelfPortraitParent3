from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS

db = SQLAlchemy()
migrate = Migrate()

def create_app():
    app = Flask(__name__)

    CORS(app,
         resources={r"/*": {"origins": "http://localhost:3000"}},
         supports_credentials=True,
         allow_headers=["Content-Type"],
         methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
    )

    # Use your Config or ProductionConfig from SelfPortraitControlPlatform/config.py
    app.config.from_object('SelfPortraitControlPlatform.config.Config')
    # or: app.config.from_object('SelfPortraitControlPlatform.config.ProductionConfig')

    db.init_app(app)
    migrate.init_app(app, db)

    from app import models  # Ensure models are imported
    from app.routes import main_bp
    app.register_blueprint(main_bp)

    return app
