import os

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'your_secret_key')  # Change this for production
    #SQLALCHEMY_DATABASE_URI = "mysql://user1:password1@localhost/self_portrait_platform"
    SQLALCHEMY_DATABASE_URI = "mysql+pymysql://user1:password1@localhost/self_portrait_platform"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    """
    SESSION_COOKIE_SAMESITE = 'None'  # <-- crucial
    SESSION_COOKIE_SECURE = True
    """

    """
    # In config.py or app config
    SESSION_COOKIE_SECURE = True  # not secure, so it's sent over HTTP
    SESSION_COOKIE_SAMESITE = "None"  # to allow cross-site (React at 3000, Flask at 5001)
    """

    SESSION_COOKIE_SECURE = False           # For development, no HTTPS required
    SESSION_COOKIE_SAMESITE = "Lax"         # Use 'Lax' or 'Strict' instead of 'None'
    PERMANENT_SESSION_LIFETIME = 31 * 24 * 60 * 60


class ProductionConfig(Config):
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///default.db')
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-production-secret-key')
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_SAMESITE = 'Lax'

