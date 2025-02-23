from app import db
from datetime import datetime
from sqlalchemy.dialects.mysql import JSON


class User(db.Model):
    """
    Represents a staff or admin user in the system.
    Example usage:
        - Admin logs in
        - Designer assigned to Artwork
        - Production staff assigned to production tasks
    """
    __tablename__ = 'user'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)

    def __repr__(self):
        return f"<User {self.username}>"



class Order(db.Model):
    __tablename__ = 'order'
    id = db.Column(db.Integer, primary_key=True)
    reason = db.Column(db.String(255))
    product = db.Column(db.String(255))
    free_sample = db.Column(db.Boolean, default=False)
    first_name = db.Column(db.String(255))
    last_name = db.Column(db.String(255))
    school_name = db.Column(db.String(255))
    position = db.Column(db.String(255))
    art_packs = db.Column(db.Integer)
    referral = db.Column(db.String(255))
    email = db.Column(db.String(255))
    phone = db.Column(db.String(50))
    address_line1 = db.Column(db.String(255))
    address_line2 = db.Column(db.String(255))
    city = db.Column(db.String(255))
    county = db.Column(db.String(255))
    postcode = db.Column(db.String(50))
    delivery_instructions = db.Column(db.Text)  # or String(500), etc.
    agree_to_promotions = db.Column(db.Boolean, default=False)

    status = db.Column(db.String(50), default='Requested')

    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    portal_username = db.Column(db.String(255), nullable=True)
    portal_password = db.Column(db.String(50), nullable=True)
    kit_dispatched_at = db.Column(db.String(255), default='Kit not dispatched yet')
    kit_received_at = db.Column(db.String(255), default='Kit not received yet')
    quantities = db.Column(db.String(255), default='Unconfirmed')


    # Relationships
    kits = db.relationship('Kit', backref='order', lazy=True)
    artworks = db.relationship('Artwork', backref='order', lazy=True)
    invoice = db.relationship('Invoice', uselist=False, backref='order')  # One-to-one

    def __repr__(self):
        return f"<Order {self.id} - {self.school_name}>"


class Kit(db.Model):
    """
    Represents a physical kit sent to a school.
    For example, it may store dispatch date, tracking number, etc.
    """
    __tablename__ = 'kits'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)

    dispatch_date = db.Column(db.DateTime)
    tracking_number = db.Column(db.String(255))
    # Potential future columns: shipping_label_url, kit_status, etc.

    def __repr__(self):
        return f"<Kit {self.id} for Order {self.order_id}>"


class Artwork(db.Model):
    """
    Represents artwork or design files for a given order.
    Could store revision notes, file paths, or statuses for approval.
    """
    __tablename__ = 'artworks'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)

    design_file_path = db.Column(db.String(255))
    status = db.Column(db.String(50), default='In Artwork')
    # Could store multiple revisions, notes, etc.

    def __repr__(self):
        return f"<Artwork {self.id} for Order {self.order_id}>"


class Invoice(db.Model):
    """
    Represents the invoice for a particular order (one-to-one relationship).
    Possibly store invoice_date, paid_date, etc.
    """
    __tablename__ = 'invoices'
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)

    amount = db.Column(db.Float)
    status = db.Column(db.String(50), default='Ungenerated')
    # Additional fields: invoice_date, paid_date, etc.

    def __repr__(self):
        return f"<Invoice {self.id} for Order {self.order_id}>"


class Task(db.Model):
    __tablename__ = 'tasks'
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(255))
    due_date = db.Column(db.DateTime)
    completed = db.Column(db.Boolean, default=False)

    # NEW COLUMNS:
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=True)
    task_type = db.Column(db.String(50), nullable=True)

    # If you want a direct relationship, you can add this:
    # order = db.relationship('Order', backref='tasks', lazy=True)

    def __repr__(self):
        return f"<Task {self.id} - {self.description}>"

