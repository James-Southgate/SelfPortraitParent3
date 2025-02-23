# In a new file like app/pdf_utils.py or anywhere you like:

# pdf_utils.py

import os
from datetime import datetime
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.platypus import Table, TableStyle


# app/pdf_utils.py

def create_checklist_pdf(order):
    """
    Creates a PDF containing a checklist for the school to verify their kit contents
    and confirm important details.
    """

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=50,
        rightMargin=50,
        topMargin=50,
        bottomMargin=50
    )

    styles = getSampleStyleSheet()
    normal_style = styles["Normal"]
    heading_style = styles["Heading1"]

    # Let’s keep alignment left for a typical checklist
    heading_style.alignment = TA_LEFT

    elements = []

    # Title
    elements.append(Paragraph("Kit Checklist", heading_style))
    elements.append(Spacer(1, 12))


    if order.free_sample == 1:
        checklist_text = f"""
        <strong>Order ID: {order.id}</strong><br/><br/>
        For: {order.first_name + ' ' + order.last_name}<br/>
        School: {order.school_name}<br/><br/>
                
        Please verify the following items are present and correct:<br/>
        - Templates Quantity: {order.art_packs}<br/>
        - Pens Quantity: {order.art_packs}<br/>
        - 'What to do next' Paper<br/>
        - Free Sample<br/>
        - DPD Paper Work<br/>
        - Correct Address on DPD Paperwork: {order.address_line1} {order.address_line2}, {order.city}, {order.county}, {order.postcode}
        """
    else:
        checklist_text = f"""
        <strong>Order ID: {order.id}</strong><br/><br/>
        For: {order.first_name + ' ' + order.last_name}<br/>
        School: {order.school_name}<br/><br/>

        Please verify the following items are present and correct:<br/><br/>
        - Templates Quantity: {order.art_packs}<br/>
        - Pens Quantity: {order.art_packs}<br/>
        - 'What to do next' Paper<br/>
        - DPD Paper Work<br/>
        - Correct Address on DPD Paperwork: {order.address_line1} {order.address_line2}, {order.city}, {order.county}, {order.postcode}<br/><br/>
        """

    elements.append(Paragraph(checklist_text, normal_style))
    elements.append(Spacer(1, 12))

    # You could add a final statement or signature line:
    final_text = """
    Please review all items carefully. If something is missing or incorrect please let someone know as soon as possible.<br/><br/><br/>
    """
    elements.append(Paragraph(final_text, normal_style))


    elements.append(Paragraph("ONCE CHECKED YOU CAN BIN THIS PIECE OF PAPER", heading_style))
    elements.append(Spacer(1, 12))

    doc.build(elements)

    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data





def create_next_steps_pdf(order):
    """
    Creates a PDF with instructions for "Next Steps" after receiving the kit.
    Uses the order.portal_username and order.portal_password from the DB
    so it doesn't change each time.
    """

    # 1) Pull username/password from the Order
    #    If they're None, handle gracefully
    username = order.portal_username or "user"
    password = order.portal_password or "1234567890"

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=50,
        rightMargin=50,
        topMargin=50,
        bottomMargin=50
    )

    styles = getSampleStyleSheet()
    normal_style = styles["Normal"]
    heading_style = styles["Heading1"]

    # Center-align the headings for this document
    heading_style.alignment = TA_CENTER

    elements = []

    # Title
    elements.append(Paragraph("Next Steps", heading_style))
    elements.append(Spacer(1, 12))

    # Next Steps instructions
    next_steps_text = f"""
    Now that you have received your kit, you should visit the Class Fundraising portal 
    to confirm you have received everything correctly.<br/><br/>

    Please log onto the portal using the following credentials:<br/><br/>

    Username: <strong>{username}</strong><br/>
    Password: <strong>{password}</strong><br/><br/>

    If you have any issues with the kit, please contact our support desk at:
    (Alpha Graphics / Class Fundraising Support Desk contact details)<br/><br/>
    """
    # Center-align normal paragraphs
    normal_style.alignment = TA_CENTER
    elements.append(Paragraph(next_steps_text, normal_style))
    elements.append(Spacer(1, 24))

    # How to Return Section
    how_to_return_heading = Paragraph("How to Return Items", heading_style)
    elements.append(how_to_return_heading)
    elements.append(Spacer(1, 12))

    return_text = """
    Once all the artwork has been completed by the students, follow these steps to return the package:<br/><br/>
    1. Ensure all artwork is properly labeled and packed in the original kit box.<br/>
    2. Verify that the contents include:<br/>
       - All completed artwork<br/>
       - Any additional forms or notes requested in the kit<br/>
    3. Seal the package securely to avoid damage during transit.<br/>
    4. Attach the pre-paid return shipping label provided in your kit. If you do not have a label, contact our support desk.<br/>
    5. Drop off the package at your nearest shipping center, or arrange for a pickup as per the instructions in the kit.<br/><br/>

    If you have any questions or encounter issues with returning the package, please contact our support desk for assistance.
    """
    # Reuse center alignment for consistency
    elements.append(Paragraph(return_text, normal_style))
    elements.append(Spacer(1, 24))

    # Build the PDF document
    doc.build(elements)

    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data



def create_invoice_pdf(order, kit_items=None):
    """
    Creates a PDF invoice/packing slip in memory (BytesIO) for a given Order object.
    :param order: The Order object from your database.
    :param kit_items: A list of (SKU, Description, Quantity), or build it dynamically.
    :return: A BytesIO buffer containing the PDF data.
    """
    if kit_items is None:
        # Fallback items if none are provided
        if order.free_sample == 1:
            kit_items = [
                ["Self Portrait Templates", "A4 Paper Document", order.art_packs],
                ["Pens", "Blue Ball Point Pens", order.art_packs],
                ["What's Next", "A4 Paper Document", 1],
                ["Free Sample", "Finished Product Sample", 1],
            ]
        else:
            kit_items = [
                ["Self Portrait Templates", "A4 Paper Document", order.art_packs],
                ["Pens", "Blue Ball Point Pens", order.art_packs],
                ["What's Next", "A4 Paper Document", 1],
            ]

    # 1) Create an in-memory buffer
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=10,
        rightMargin=10,
        topMargin=15,
        bottomMargin=10
    )

    elements = []

    # Build the item data table dynamically
    # ReportLab expects everything as strings
    item_data = [
        ["SKU/ Item name", "Item Description", "Quantity"]  # table header
    ]
    for item in kit_items:
        sku, desc, qty = item
        item_data.append([
            str(sku),
            str(desc),
            str(qty)
        ])

    item_table = Table(item_data, colWidths=[120, 370, 70])
    item_table_style = TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("ALIGN", (0, 0), (-1, 0), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 1, colors.black),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
    ])
    item_table.setStyle(item_table_style)

    # 2) Construct "Order Information"
    # You can format dates with .strftime or just store them as strings
    order_info = f"""Order Number:\n#{order.id}\nOrder Created at date:\n{order.created_at.strftime("%B %d, %Y") if order.created_at else "N/A"}"""

    # 3) "Shipping From" could be your fulfillment center
    # Hard-code or store in config
    shipping_from = (
        "AG Fulfillment Center\n"
        "123 West Road\n"
        "Greater London, LD3 3RT\n"
        "United Kingdom\n"
        "01202 364824"
    )

    # 4) "Shipping To" uses the data from your Order
    # In your DB, you have address_line1, address_line2, city, county, postcode, phone, etc.
    shipping_to = (
        f"{order.first_name} {order.last_name}\n"
        f"Address: {order.address_line1 or ''} {order.address_line2 or ''}\n"
        f"City: {order.city or ''}\n"
        f"County: {order.county or ''}\n"
        f"Post Code: {order.postcode or ''}\n"
        "United Kingdom\n"  # Or adapt if different
        f"{order.phone or ''}"
    )

    # Parent table data
    parent_data = [
        ["Class Fundraising - Self Portrait Project Art Pack", "", ""],  # Row 0 (title)
        ["Order Information", "Shipping From", "Shipping To"],  # Row 1 (headers)
        [order_info, shipping_from, shipping_to],  # Row 2
        [item_table, "", ""],  # Row 3 (nested items)
    ]
    parent_table = Table(parent_data, colWidths=[190, 190, 190])

    parent_table_style = TableStyle([
        ("BOX", (0, 0), (-1, -1), 1, colors.black),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("SPAN", (0, 0), (2, 0)),  # Title row spans columns 0-2
        ("SPAN", (0, 3), (2, 3)),  # Items row spans columns 0-2

        ("ALIGN", (0, 0), (2, 0), "CENTER"),
        ("FONTNAME", (0, 0), (2, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (2, 0), 16),
        ("BOTTOMPADDING", (0, 0), (2, 0), 12),

        ("ALIGN", (0, 1), (2, 1), "CENTER"),
        ("FONTNAME", (0, 1), (2, 1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 1), (2, 1), 10),
        ("BACKGROUND", (0, 1), (2, 1), colors.lightgrey),
        ("BOTTOMPADDING", (0, 1), (2, 1), 6),
        ("TOPPADDING", (0, 1), (2, 1), 6),

        ("VALIGN", (0, 2), (2, 2), "TOP"),
        ("FONTNAME", (0, 2), (2, 2), "Helvetica"),
        ("FONTSIZE", (0, 2), (2, 2), 10),
        ("LEFTPADDING", (0, 2), (2, 2), 6),
        ("RIGHTPADDING", (0, 2), (2, 2), 6),

        ("VALIGN", (0, 3), (2, 3), "TOP"),
    ])
    parent_table.setStyle(parent_table_style)
    elements.append(parent_table)

    doc.build(elements)

    # Return PDF data as bytes
    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data


# app/pdf_utils.py
"""
def generate_invoice_pdf(order, invoice):
    #Generates a PDF invoice and returns the file path where it is saved.
    #Example:
    #  "static/invoices/InvoiceIdNumber{invoice.id}_OrderId{order.id}/InvoiceIdNumber{invoice.id}_OrderId{order.id}.pdf"
    # 1) Construct the folder name & filename
    detailed_invoice_name = f"InvoiceIdNumber{invoice.id}_OrderId{order.id}"
    invoices_folder = os.path.join("app", "static", "invoices", detailed_invoice_name)
    os.makedirs(invoices_folder, exist_ok=True)

    pdf_filename = f"{detailed_invoice_name}.pdf"
    pdf_path = os.path.join(invoices_folder, pdf_filename)

    # 2) Example data for the invoice
    #    In a real scenario, you'd fill these from order/invoice fields (like order.school_name, order.art_packs, etc.)
    comp_name = order.school_name or "Unknown School"
    invoice_id_str = str(invoice.id)
    invoice_date = datetime.utcnow().strftime('%m/%d/%Y')  # e.g. "01/08/2025"
    due_date = "Due date logic here"  # or compute from 30 days
    total_str = f"${invoice.amount:.2f}" if invoice.amount else "$0.00"

    # 3) Start generating the PDF
    pdf = canvas.Canvas(pdf_path, pagesize=letter)
    width, height = letter

    # ~~~~ EXAMPLE ~~~~ (similar to your snippet)
    # If you have a real logo, put the correct path
    image_path = os.path.join("app", "static", "CFLogo.png")  # update as needed
    try:
        pdf.drawImage(
            image_path,
            50,
            height - 100,
            width=100,
            height=50,
            preserveAspectRatio=True,
            mask='auto'
        )
    except:
        pass  # If the logo file doesn't exist, skip

    pdf.setFont("Helvetica", 8)
    pdf.drawRightString(width - 50, height - 80, "227 Cobblestone Road, Bedrock")
    pdf.drawRightString(width - 50, height - 95, "01202 000000  https://classfundraising.co.uk/  Email@Emailhere.com")

    # Draw the word "Invoice"
    pdf.setFont("Helvetica", 12)
    pdf.drawString(50, height - 170, "Invoice")
    pdf.drawRightString(width - 50, height - 170, f"Invoice # {invoice_id_str}")

    pdf.setStrokeColor(colors.black)
    pdf.setLineWidth(1)
    pdf.line(50, height - 180, width - 50, height - 185)

    # ~~~~ Example of using actual data ~~~~
    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(50, height - 200, f"Issue Date: {invoice_date}")
    pdf.drawString(50, height - 215, "Net: 21")  # or net-terms logic
    pdf.drawString(50, height - 230, f"Due Date: {due_date}")
    pdf.drawString(50, height - 245, f"Total: {total_str}")

    # "Bill to"
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawRightString(width - 50, height - 200, "Bill to:")
    pdf.setFont("Helvetica", 10)
    pdf.drawRightString(width - 50, height - 215, comp_name)
    # etc.

    # Build a simple Table of items
    data = [
        ["", "Item", "Quantity", "Price", "Tax", "Line Total"],
        # Hard-coded example row(s). Replace with real data from your order/invoice lines
        ["1", "Art Pack", f"{order.art_packs}", "$100.00", "5%", f"${order.art_packs * 100 * 1.05:.2f}"],
    ]
    table = Table(data, colWidths=[15, 185, 50, 70, 60, 70])
    style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (-5, -99), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, colors.grey),
        ('LINEBELOW', (0, 1), (-1, -1), 0.5, colors.grey),
    ])
    table.setStyle(style)
    table.wrapOn(pdf, width, height)
    table.drawOn(pdf, 50, height - 400)

    # Totals Table Example
    totals_data = [
        ["Subtotal", "$???"],
        ["Tax (5%)", "$???"],
        ["Total", total_str],
        ["Paid", "$0.00"],
        ["Amount Due", total_str],
    ]
    totals_table = Table(totals_data, colWidths=[100, 50])
    totals_style = TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('LINEBELOW', (0, 2), (-1, -4), 0.5, colors.grey),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
    ])
    totals_table.setStyle(totals_style)
    totals_table.wrapOn(pdf, width, height)
    totals_table.drawOn(pdf, 410, height - 535)

    # Footer
    pdf.setFont("Helvetica", 8)
    pdf.drawString(50, 70, "Payment details: ACC:123000005 IBAN:US100000060345 SWIFT:BOA000")

    # Save final PDF
    pdf.save()

    return pdf_path
"""


def generate_invoice_pdf(order, invoice):
    """
    Generates a PDF invoice on the fly and returns the PDF data as bytes.
    """
    # Initialize a BytesIO buffer and create a ReportLab canvas using it
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter

    # Example logo drawing (adjust path as necessary)
    image_path = os.path.join("app", "static", "CFLogo.png")
    try:
        pdf.drawImage(
            image_path,
            50,
            height - 100,
            width=100,
            height=50,
            preserveAspectRatio=True,
            mask='auto'
        )
    except Exception as e:
        print(f"Logo drawImage error: {e}")

    # Set up fonts and draw header information
    pdf.setFont("Helvetica", 8)
    pdf.drawRightString(width - 50, height - 80, "227 Cobblestone Road, Bedrock")
    pdf.drawRightString(width - 50, height - 95, "01202 364824  https://classfundraising.co.uk/  Email@Emailhere.com")

    invoice_id_str = str(invoice.id)
    invoice_date = datetime.utcnow().strftime('%m/%d/%Y')
    due_date = "Due date logic here"
    total_str = f"${invoice.amount:.2f}" if invoice.amount else "$0.00"

    pdf.setFont("Helvetica", 12)
    pdf.drawString(50, height - 170, "Invoice")
    pdf.drawRightString(width - 50, height - 170, f"Invoice # {invoice_id_str}")

    pdf.setStrokeColor(colors.black)
    pdf.setLineWidth(1)
    pdf.line(50, height - 180, width - 50, height - 185)

    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(50, height - 200, f"Issue Date: {invoice_date}")
    pdf.drawString(50, height - 215, "Net: 21")
    pdf.drawString(50, height - 230, f"Due Date: {due_date}")
    pdf.drawString(50, height - 245, f"Total: {total_str}")

    # "Bill to" section
    comp_name = order.school_name or "Unknown School"
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawRightString(width - 50, height - 200, "Bill to:")
    pdf.setFont("Helvetica", 10)
    pdf.drawRightString(width - 50, height - 215, comp_name)
    # ... Additional billing details as needed ...

    # Build a simple table of items
    data = [
        ["", "Item", "Quantity", "Price", "Tax", "Line Total"],
        ["1", "Art Pack", f"{order.art_packs}", "$100.00", "5%", f"${order.art_packs * 100 * 1.05:.2f}"],
    ]
    table = Table(data, colWidths=[15, 185, 50, 70, 60, 70])
    style = TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
    ])
    table.setStyle(style)
    table.wrapOn(pdf, width, height)
    table.drawOn(pdf, 50, height - 400)

    # Totals Table Example
    totals_data = [
        ["Subtotal", "$???"],
        ["Tax (5%)", "$???"],
        ["Total", total_str],
        ["Paid", "$0.00"],
        ["Amount Due", total_str],
    ]
    totals_table = Table(totals_data, colWidths=[100, 50])
    totals_style = TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('LINEBELOW', (0, 2), (-1, -4), 0.5, colors.grey),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
    ])
    totals_table.setStyle(totals_style)
    totals_table.wrapOn(pdf, width, height)
    totals_table.drawOn(pdf, 410, height - 535)

    # Footer
    pdf.setFont("Helvetica", 8)
    pdf.drawString(50, 70, "Payment details: ACC:123000005 IBAN:US100000060345 SWIFT:BOA000")

    # Finalize PDF generation
    pdf.save()  # This writes to the buffer
    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data


# app/pdf_utils.py

def create_final_package_checklist_pdf(order):
    """
    Generates a PDF 'Final Package Checklist' for the given order.
    This is similar to your existing kit checklist, but with final details.
    """

    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import inch
    import io

    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)

    # 1) Add a title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(1 * inch, 10.5 * inch, "Final Package Checklist")

    # 2) Show basic order details
    c.setFont("Helvetica", 12)
    c.drawString(1 * inch, 9.8 * inch, f"Order ID: {order.id}")
    c.drawString(1 * inch, 9.5 * inch, f"School Name: {order.school_name}")
    c.drawString(1 * inch, 9.2 * inch, f"Status: {order.status}")

    # (Optional) Add more fields from your `order` model as needed
    # e.g. phone, email, shipping address, etc.
    c.drawString(1 * inch, 8.9 * inch, f"Contact Phone: {order.phone}")
    c.drawString(1 * inch, 8.6 * inch, f"Delivery Address: {order.address_line1}, {order.city}, {order.postcode}")

    # Now let's add the code that prints out the "quantities":
    import json
    if order.quantities and order.quantities != "Unconfirmed":
        try:
            parsed_q = json.loads(order.quantities)  # e.g. { "ProductA": 10, "ProductB": 5 }
        except:
            parsed_q = {}

        c.setFont("Helvetica-Bold", 12)
        c.drawString(1 * inch, 8.6 * inch, "Confirmed Quantities:")

        c.setFont("Helvetica", 11)
        y_pos = 8.3 * inch
        for product_name, qty_value in parsed_q.items():
            c.drawString(1.2 * inch, y_pos, f"{product_name}: {qty_value}")
            y_pos -= 0.3 * inch

    else:
        # If needed, you can handle if it's "Unconfirmed", but typically you'd block the download anyway
        pass

    # Remind them to pay the invoice
    c.setFont("Helvetica-Bold", 12)
    c.drawString(1 * inch, 5.5 * inch, "Please remember to pay the invoice promptly!")
    c.setFont("Helvetica", 11)
    c.drawString(1 * inch, 5.2 * inch, "Thank you for your order!")

    c.showPage()
    c.save()

    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data