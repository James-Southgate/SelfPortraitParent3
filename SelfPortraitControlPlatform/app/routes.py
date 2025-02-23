import os
from flask import Blueprint, jsonify, request, send_from_directory, make_response
from SelfPortraitControlPlatform.app.models import User, Order, Kit, Artwork, Invoice, Task
from SelfPortraitControlPlatform.app import db
from datetime import datetime
from werkzeug.utils import secure_filename
import shutil

# Configure Blueprint
main_bp = Blueprint('main', __name__)


@main_bp.route('/api/orders', methods=['GET'])
def get_all_orders():
    orders = Order.query.all()

    orders_list = []
    for o in orders:
        # Gather artworks
        artworks_data = []
        for a in o.artworks:
            artworks_data.append({
                "id": a.id,
                "design_file_path": a.design_file_path,
                "status": a.status
            })

        # Gather invoice
        invoice_data = {}
        if o.invoice:
            invoice_data = {
                "id": o.invoice.id,
                "status": o.invoice.status,  # "Ungenerated", "Generated", "Invoice Sent", "Invoice Paid"
                "amount": o.invoice.amount  # optional
            }

        orders_list.append({
            "id": o.id,
            "reason": o.reason,
            "product": o.product,
            "free_sample": o.free_sample,
            "first_name": o.first_name,
            "last_name": o.last_name,
            "school_name": o.school_name,
            "position": o.position,
            "art_packs": o.art_packs,
            "referral": o.referral,
            "email": o.email,
            "phone": o.phone,
            "address_line1": o.address_line1,
            "address_line2": o.address_line2,
            "city": o.city,
            "county": o.county,
            "postcode": o.postcode,
            "delivery_instructions": o.delivery_instructions,
            "agree_to_promotions": o.agree_to_promotions,

            "status": o.status,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "updated_at": o.updated_at.isoformat() if o.updated_at else None,
            "kit_dispatched_at": o.kit_dispatched_at,
            "kit_received_at": o.kit_received_at,
            "quantities": json.loads(o.quantities) if o.quantities and o.quantities != "Unconfirmed" else "Unconfirmed",

            # Attach the artworks array
            "artworks": artworks_data,

            # Attach the invoice object
            "invoice": invoice_data
        })

    return jsonify(orders_list)

# API endpoint: Create an order
@main_bp.route('/api/orders', methods=['OPTIONS', 'POST'])
def create_order():
    # Preflight (OPTIONS) request
    if request.method == 'OPTIONS':
        # Return a simple 200 OK so CORS preflight can succeed
        return '', 200

    # For debugging only; you actually said you don't handle GET on this route
    if request.method == 'GET':
        return jsonify({"info": "GET /api/orders works! But we only handle POST for new orders."})

    # POST request
    if request.method == 'POST':
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        import random

        first = (data.get('firstName') or "").lower().replace(" ", "")
        last = (data.get('surname') or "").lower().replace(" ", "")
        portal_username = first + last if first or last else "user"

        # Generate a 10-digit random password (digits 1..9)
        portal_password = "".join(str(random.randint(1, 9)) for _ in range(10))

        new_order = Order(
            reason=data.get('reason'),
            product=data.get('product'),
            free_sample=data.get('freeSample'),
            first_name=data.get('firstName'),
            last_name=data.get('surname'),
            school_name=data.get('organisation'),
            position=data.get('position'),
            art_packs=int(data.get('artPacks')) if data.get('artPacks') else 0,
            referral=data.get('referral'),
            email=data.get('email'),
            phone=data.get('phone'),
            address_line1=data.get('addressLine1'),
            address_line2=data.get('addressLine2'),
            city=data.get('city'),
            county=data.get('county'),
            postcode=data.get('postcode'),
            delivery_instructions=data.get('deliveryInstructions'),
            agree_to_promotions=data.get('agreeToPromotions', False),

            status='Requested',

            portal_username=portal_username,
            portal_password=portal_password,

        )
        db.session.add(new_order)
        db.session.commit()  # Now new_order has a valid .id

        # 2) Create child rows for Kit, Artwork, and Invoice
        # You can customize these as you wish
        kit = Kit(
            order_id=new_order.id,
            dispatch_date=None,  # or datetime.utcnow(), etc.
            tracking_number=None  # Fill in if you have a default
        )
        db.session.add(kit)

        artwork = Artwork(
            order_id=new_order.id,
            design_file_path=None,  # fill in if you have a default path
            status='Portraits Not Received From School Yet'  # defaults to "In Artwork"
        )
        db.session.add(artwork)

        invoice = Invoice(
            order_id=new_order.id,
            amount=0.0,  # or some default amount
            status='Ungenerated'  # defaults to "Unpaid"
        )
        db.session.add(invoice)

        # 3) Commit everything together
        db.session.commit()

        return jsonify({
            "message": "Order created",
            "order_id": new_order.id
        }), 201


@main_bp.route('/api/orders/<int:order_id>/status', methods=['PATCH'])
def update_order_status(order_id):
    order = Order.query.get_or_404(order_id)
    data = request.get_json()
    new_status = data.get('status')
    if not new_status:
        return jsonify({"error": "Missing status"}), 400

    # Prevent closing the order if invoice is not paid
    if new_status == 'Closed':
        invoice = order.invoice
        if not invoice or invoice.status != 'Invoice Paid':
            return jsonify({
                "error": "Invoice status needs to be 'Invoice Paid' in order to update the order status to Closed."
            }), 400


    # Update the status
    order.status = new_status

    if new_status == 'Kit Prepared':
        order.kit_dispatched_at = 'Kit not dispatched yet'

    # If the new status is "Kit Dispatched", set kit_dispatched_at to the current date/time
    if new_status == 'Kit Dispatched':
        order.kit_received_at = 'Kit not received yet'
        order.kit_dispatched_at = datetime.utcnow().isoformat()

    # 1) If the new status is "Kit Received"
    if new_status == 'Kit Received':
        order.kit_dispatched_at = 'Kit Received'
        # Mark the time
        order.kit_received_at = datetime.utcnow().isoformat()

        # 2) Find all tasks with the same order_id and task_type='kit_follow_up_call'
        tasks_to_remove = Task.query.filter_by(order_id=order.id, task_type='kit_follow_up_call').all()

        # 3) Delete them from the session
        for t in tasks_to_remove:
            db.session.delete(t)

    if new_status == 'Kit Returned':
        order.kit_received_at = 'Kit Returned'
        from SelfPortraitControlPlatform.app.trello_integration import create_trello_card
        card_data = create_trello_card(order)
        if card_data is None:
            print("[TRELLO] Could not create a Trello card (check logs).")
        else:
            # Optionally, you might want to store the Trello card ID or URL in your DB
            # e.g. order.trello_card_id = card_data['id']
            print(f"[TRELLO] Card created: {card_data.get('shortUrl')}")

        # 2) Find all tasks with the same order_id and task_type='kit_follow_up_call'
        tasks_to_remove = Task.query.filter_by(order_id=order.id, task_type='kit_completion_follow_up').all()

        # 3) Delete them from the session
        for t in tasks_to_remove:
            db.session.delete(t)

    if new_status == 'In Production':
        order_folder = os.path.join(ARTWORK_UPLOAD_FOLDER, str(order.id))
        try:
            shutil.rmtree(order_folder, ignore_errors=True)
            print(f"[CLEANUP] Deleted folder for Order {order.id}: {order_folder}")
        except Exception as e:
            print(f"[CLEANUP] Could not remove folder: {e}")
        # Optionally, also reset Artwork.design_file_path to None
        artwork = Artwork.query.filter_by(order_id=order.id).first()
        if artwork:
            artwork.design_file_path = None

    # 4) Commit all changes together
    db.session.commit()
    return jsonify({"message": f"Order status updated to {new_status}"}), 200



import os
from flask import Blueprint, send_from_directory

main_bp = Blueprint('main', __name__)

# Compute an absolute path to the build/ folder
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR = os.path.abspath(
    os.path.join(CURRENT_DIR, "..", "..", "self-portrait-website", "build")
)

import os
from flask import send_from_directory

# Compute an absolute path to the React build folder
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR = os.path.abspath(os.path.join(CURRENT_DIR, "..", "..", "self-portrait-website", "build"))

@main_bp.route("/", defaults={"path": ""})
@main_bp.route("/<path:path>")
def serve_react(path):
    # If a specific asset is requested and exists, serve it.
    if path and os.path.exists(os.path.join(BUILD_DIR, path)):
        return send_from_directory(BUILD_DIR, path)
    # Otherwise, serve index.html (for client-side routing)
    return send_from_directory(BUILD_DIR, "index.html")



@main_bp.after_request
def after_request(response):
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Methods"] = "GET,HEAD,OPTIONS,POST,PUT,PATCH,DELETE"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    return response


##############################################################################
# NEW ROUTE: Generate and return a PDF packing slip (or invoice)
##############################################################################

@main_bp.route('/api/orders/<int:order_id>/packing-slip', methods=['GET'])
def generate_packing_slip(order_id):
    from SelfPortraitControlPlatform.app.pdf_utils import create_invoice_pdf

    order = Order.query.get_or_404(order_id)

    pdf_data = create_invoice_pdf(order)

    response = make_response(pdf_data)
    response.headers.set('Content-Disposition', 'attachment',
                         filename=f'packing_slip_order_{order_id}.pdf')
    response.headers.set('Content-Type', 'application/pdf')
    return response




@main_bp.route('/api/orders/<int:order_id>/next-steps', methods=['GET'])
def generate_next_steps(order_id):
    from SelfPortraitControlPlatform.app.pdf_utils import create_next_steps_pdf
    order = Order.query.get_or_404(order_id)

    pdf_data = create_next_steps_pdf(order)

    response = make_response(pdf_data)
    response.headers.set('Content-Disposition', 'attachment',
                         filename=f'next_steps_order_{order_id}.pdf')
    response.headers.set('Content-Type', 'application/pdf')
    return response



@main_bp.route('/api/orders/<int:order_id>/checklist', methods=['GET'])
def generate_checklist(order_id):
    from SelfPortraitControlPlatform.app.pdf_utils import create_checklist_pdf
    order = Order.query.get_or_404(order_id)

    pdf_data = create_checklist_pdf(order)

    response = make_response(pdf_data)
    response.headers.set('Content-Disposition', 'attachment',
                         filename=f'checklist_order_{order_id}.pdf')
    response.headers.set('Content-Type', 'application/pdf')
    return response


# app/routes.py

@main_bp.route('/api/orders/<int:order_id>/final-package-checklist', methods=['GET'])
def generate_final_package_checklist(order_id):
    from SelfPortraitControlPlatform.app.pdf_utils import create_final_package_checklist_pdf
    from flask import make_response

    order = Order.query.get_or_404(order_id)

    # Optional server-side check
    if not order.quantities or order.quantities == "Unconfirmed":
        return jsonify({"error": "Cannot generate Final Package Checklist until quantities are confirmed"}), 400

    pdf_data = create_final_package_checklist_pdf(order)

    response = make_response(pdf_data)
    response.headers.set('Content-Disposition', 'attachment',
                         filename=f'final_package_checklist_order_{order_id}.pdf')
    response.headers.set('Content-Type', 'application/pdf')
    return response





@main_bp.route('/api/school-portal/login', methods=['POST'])
def school_portal_login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    username = data.get('username', '').strip()
    password = data.get('password', '').strip()

    # Query the Order table to see if there's a match
    order = Order.query.filter_by(portal_username=username, portal_password=password).first()
    if not order:
        return jsonify({"error": "Invalid credentials"}), 401

    # If found, return JSON with order info
    return jsonify({
        "id": order.id,
        "status": order.status,
        "school_name": order.school_name,
        # You can add more fields as needed
    }), 200


# In routes.py (or wherever your tasks endpoints are):
@main_bp.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.get_json() or {}
    if data.get('description'):
        description = data.get('description', '').strip()
    else:
        description = "N/A"
    if data.get('order_id'):
        order_id = data.get('order_id') # may be None if not provided
    elif not int(data.get('order_id')):
        order_id = None
    else:
        order_id = None

    task_type = data.get('task_type', '').strip() or None

    """
    if not description:
        return jsonify({"error": "Missing description"}), 400
    """

    # If you want to enforce that both order_id and task_type are required, check them here:
    # if not order_id or not task_type:
    #     return jsonify({"error": "Missing order_id or task_type"}), 400

    # Check if a task with the same (order_id, task_type) already exists
    # Only do this if order_id and task_type are meaningful in your scenario.
    """
    if order_id and task_type:
        existing = Task.query.filter_by(order_id=order_id, task_type=task_type).first()
        if existing:
            return jsonify({"message": "Task for this order & task_type already exists"}), 409
    """

    new_task = Task(
        description=description,
        due_date=None,  # or data.get('due_date')
        completed=False,
        order_id=order_id,
        task_type=task_type
    )
    db.session.add(new_task)
    db.session.commit()

    return jsonify({
        "message": "Task created",
        "task_id": new_task.id
    }), 201



@main_bp.route('/api/tasks', methods=['GET'])
def get_all_tasks():
    tasks = Task.query.all()
    tasks_list = []
    for t in tasks:
        tasks_list.append({
            'id': t.id,
            'task_type': t.task_type,
            'description': t.description,
            'due_date': t.due_date.isoformat() if t.due_date else None,
            'completed': t.completed,
            'order_id': t.order_id
        })
    return jsonify(tasks_list)




# Define a folder for saving artwork images

# __file__ is the path to routes.py, so do something like:
ROUTES_DIR = os.path.dirname(os.path.abspath(__file__))
ARTWORK_UPLOAD_FOLDER = os.path.join(ROUTES_DIR, '..', 'app', 'static', 'artwork')
os.makedirs(ARTWORK_UPLOAD_FOLDER, exist_ok=True)




@main_bp.route('/api/orders/<int:order_id>/artwork/upload', methods=['POST'])
def upload_artwork_images(order_id):
    order = Order.query.get_or_404(order_id)
    files = request.files.getlist('images')
    if not files:
        return jsonify({"error": "No images field in form data"}), 400

    # Create a subfolder named after the order ID
    order_folder = os.path.join(ARTWORK_UPLOAD_FOLDER, str(order_id))
    os.makedirs(order_folder, exist_ok=True)

    # Fetch existing Artwork entry (assuming you only have 1 Artwork row per order)
    artwork = Artwork.query.filter_by(order_id=order_id).first()
    existing_paths = artwork.design_file_path or ""
    existing_files = existing_paths.split(",") if existing_paths else []

    saved_file_paths = []
    for file in files:
        if file.filename == '':
            continue

        filename = secure_filename(file.filename)  # sanitize
        # e.g. "5/world_icon.jpeg"
        path_in_db = f"{order_id}/{filename}"

        # --- Check if path_in_db already exists ---
        if path_in_db in existing_files:
            print(f"[UPLOAD] Skipping duplicate: {path_in_db}")
            continue  # Skip saving

        # Otherwise, proceed to save
        save_path = os.path.join(order_folder, filename)
        file.save(save_path)
        saved_file_paths.append(path_in_db)

    # Update Artwork.design_file_path with newly added references
    if saved_file_paths:
        new_paths = existing_files + saved_file_paths
        artwork.design_file_path = ",".join(new_paths)
        db.session.commit()

    return jsonify({"message": "Images uploaded successfully!"}), 200






@main_bp.route('/static/artwork/<path:filename>')
def serve_artwork(filename):
    """
    Serve a file from SelfPortraitControlPlatform.app/static/artwork (including subfolders).
    <path:filename> means it can contain slashes like 5/world_icon.jpeg
    """
    return send_from_directory(ARTWORK_UPLOAD_FOLDER, filename)




# routes.py

@main_bp.route('/api/orders/<int:order_id>/artwork/delete', methods=['DELETE'])
def delete_artwork_file(order_id):
    """
    Removes a single image reference from Artwork.design_file_path
    and deletes the physical file from disk.
    Expects JSON: {"filename": "7/world_icon.jpeg"}
    """
    data = request.get_json()
    if not data or 'filename' not in data:
        return jsonify({"error": "Missing 'filename' in request"}), 400

    filename_to_delete = data['filename']  # e.g. "7/world_icon.jpeg"

    # 1) Check that this order + Artwork actually exists
    artwork = Artwork.query.filter_by(order_id=order_id).first()
    if not artwork:
        return jsonify({"error": "No Artwork record found for this order"}), 404

    existing_paths = artwork.design_file_path or ""
    paths_list = [p.strip() for p in existing_paths.split(',') if p.strip()]

    # 2) Check if this filename is in the Artwork row
    if filename_to_delete not in paths_list:
        return jsonify({"error": f"File {filename_to_delete} not found in Artwork.design_file_path"}), 404

    # 3) Remove from the DB entry
    paths_list.remove(filename_to_delete)
    artwork.design_file_path = ",".join(paths_list) if paths_list else None
    db.session.commit()

    # 4) Delete from disk
    file_path = os.path.join(ARTWORK_UPLOAD_FOLDER, filename_to_delete)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            print(f"[DELETE] Removed file from disk: {file_path}")
        except Exception as e:
            print(f"[DELETE] Could not remove file: {e}")

    return jsonify({"message": f"File {filename_to_delete} deleted"}), 200


@main_bp.route('/api/invoices/<int:invoice_id>/status', methods=['PATCH'])
def update_invoice_status(invoice_id):
    from SelfPortraitControlPlatform.app.pdf_utils import generate_invoice_pdf
    invoice = Invoice.query.get_or_404(invoice_id)
    data = request.get_json()
    new_status = data.get('status')
    if not new_status:
        return jsonify({"error": "Missing status"}), 400

    old_status = invoice.status
    invoice.status = new_status

    # If the new status is "Generated" and old_status was "Ungenerated", let's generate the PDF
    if new_status == 'Generated' and old_status == 'Ungenerated':
        order = invoice.order  # one-to-one relationship => invoice.order is the associated order
        pdf_path = generate_invoice_pdf(order, invoice)
        # Optionally store the path in invoice, if you want quick reference
        # invoice_pdf_rel_path = pdf_path.replace(os.path.join("app", "static"), "")
        # e.g. "/invoices/InvoiceIdNumber1_OrderId1/InvoiceIdNumber1_OrderId1.pdf"
        # If you have a column in Invoice for pdf_path: invoice.pdf_path = invoice_pdf_rel_path

    db.session.commit()

    return jsonify({"message": f"Invoice status updated to {new_status}"}), 200

"""
@main_bp.route('/api/invoices/<int:invoice_id>/download', methods=['GET'])
def download_invoice(invoice_id):
    invoice = Invoice.query.get_or_404(invoice_id)
    # If your invoice table stores pdf_path in invoice.pdf_path, use that:
    #   invoice_pdf_rel_path = invoice.pdf_path
    #   full_path = os.path.join("app", "static", invoice_pdf_rel_path.lstrip("/"))
    # Otherwise, reconstruct it:
    folder_name = f"InvoiceIdNumber{invoice.id}_OrderId{invoice.order_id}"
    pdf_filename = f"{folder_name}.pdf"
    folder_path = os.path.join("app", "static", "invoices", folder_name)
    full_path = os.path.join(folder_path, pdf_filename)
    if not os.path.exists(full_path):
        return jsonify({"error": "No generated invoice found."}), 404
    # Return it as a file download
    return send_from_directory(
        directory=folder_path,
        path=pdf_filename,
        as_attachment=True
    )
"""


from SelfPortraitControlPlatform.app.pdf_utils import generate_invoice_pdf  # Ensure this function exists and works

@main_bp.route('/api/invoices/<int:invoice_id>/download', methods=['GET'])
def download_invoice(invoice_id):
    # Retrieve the invoice and its associated order from the database
    invoice = Invoice.query.get_or_404(invoice_id)
    order = invoice.order

    # Generate the PDF on the fly using your PDF utility function
    pdf_data = generate_invoice_pdf(order, invoice)

    # Create a response with the PDF data
    response = make_response(pdf_data)
    response.headers.set('Content-Disposition', 'attachment', filename=f'invoice_{invoice_id}.pdf')
    response.headers.set('Content-Type', 'application/pdf')
    return response


import json  # Add this import at the top if not present

@main_bp.route('/api/orders/<int:order_id>/quantities', methods=['PATCH'])
def update_quantities(order_id):
    order = Order.query.get_or_404(order_id)
    data = request.get_json()
    if not data or 'quantities' not in data:
        return jsonify({"error": "Missing quantities"}), 400

    # Store the quantities as a JSON string in the database
    order.quantities = json.dumps(data['quantities'])
    db.session.commit()
    return jsonify({"message": "Quantities updated successfully."}), 200




from flask import session

# routes.py

@main_bp.route('/api/staff-login', methods=['POST'])
def staff_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    # Admin check
    if username == 'admin' and password == 'admin':
        session['logged_in'] = True
        session['user_id'] = 999999
        session['is_admin'] = True
        session['username'] = 'admin'        # Store username in session
        session.permanent = True
        return jsonify({"message": "Logged in as admin"}), 200

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 401

    from werkzeug.security import check_password_hash
    if not check_password_hash(user.password, password):
        return jsonify({"error": "Incorrect password"}), 401

    session['logged_in'] = True
    session['user_id'] = user.id
    session['is_admin'] = False
    session['username'] = user.username     # Store username in session
    session.permanent = True

    return jsonify({"message": "Logged in", "id": user.id}), 200



@main_bp.route('/api/staff-logout', methods=['POST'])
def staff_logout():
    session.clear()  # Or pop specific keys
    return jsonify({"message": "Logged out"}), 200


@main_bp.route('/api/check-auth', methods=['GET'])
def check_auth():
    if session.get('logged_in'):
        return jsonify({
            "logged_in": True,
            "user_id": session['user_id'],
            "is_admin": session.get('is_admin', False),
            "username": session.get('username', "")
        })
    else:
        return jsonify({"logged_in": False, "is_admin": False})



@main_bp.route('/api/users', methods=['GET'])
def get_users():
    # 1) Check if the session is_admin is True
    if not (session.get('logged_in') and session.get('is_admin')):
        return jsonify({"error": "Unauthorized"}), 401

    # 2) Proceed
    users = User.query.all()
    users_list = [{
        "id": u.id,
        "username": u.username,
    } for u in users]
    return jsonify(users_list)


@main_bp.route('/api/users', methods=['POST'])
def create_user():
    # Admin only
    if not (session.get('logged_in') and session.get('is_admin')):
        return jsonify({"error": "Unauthorized"}), 401

    # 1) Parse data
    data = request.get_json() or {}
    new_username = data.get('username', '').strip()
    new_password = data.get('password', '').strip()

    if not new_username or not new_password:
        return jsonify({"error": "Missing username or password"}), 400

    # 2) Hash the password
    from werkzeug.security import generate_password_hash
    hashed_pw = generate_password_hash(new_password)

    # 3) Create user
    new_user = User(username=new_username, password=hashed_pw)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User created", "id": new_user.id}), 201


@main_bp.route('/api/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    # Admin only
    if not (session.get('logged_in') and session.get('is_admin')):
        return jsonify({"error": "Unauthorized"}), 401

    user = User.query.get_or_404(user_id)
    # maybe do not allow deleting yourself or the admin user
    if user.username == 'admin':
        return jsonify({"error": "Cannot delete the main admin"}), 400

    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": f"User {user_id} deleted"}), 200


# In routes.py, near other task-related routes
@main_bp.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": f"Task {task_id} deleted"}), 200
