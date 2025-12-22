"""
PDF Generation utilities for invoices, quotes, and packing slips
"""

import io
from datetime import datetime
from typing import Dict, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_RIGHT, TA_CENTER


class PDFGenerator:
    """Generate professional PDF invoices and quotes"""
    
    @staticmethod
    def generate_invoice_pdf(order: dict, store_settings: dict = None) -> bytes:
        """Generate an invoice PDF for an order"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
        
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name='RightAlign', parent=styles['Normal'], alignment=TA_RIGHT))
        styles.add(ParagraphStyle(name='CenterAlign', parent=styles['Normal'], alignment=TA_CENTER))
        styles.add(ParagraphStyle(name='SmallText', parent=styles['Normal'], fontSize=8, textColor=colors.grey))
        
        elements = []
        
        # Store info
        store_name = store_settings.get('store_name', 'TOOLS IN A BOX') if store_settings else 'TOOLS IN A BOX'
        store_email = store_settings.get('store_email', '') if store_settings else ''
        store_phone = store_settings.get('store_phone', '') if store_settings else ''
        currency_symbol = store_settings.get('currency_symbol', '$') if store_settings else '$'
        
        # Header
        header_data = [
            [Paragraph(f"<b>{store_name}</b>", styles['Heading1']), ''],
            [Paragraph(f"<b>TAX INVOICE</b>", styles['Heading2']), ''],
        ]
        header_table = Table(header_data, colWidths=[12*cm, 5*cm])
        header_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 0.5*cm))
        
        # Invoice details
        invoice_date = order.get('created_at', '')
        if isinstance(invoice_date, str):
            try:
                invoice_date = datetime.fromisoformat(invoice_date.replace('Z', '+00:00')).strftime('%d %b %Y')
            except:
                invoice_date = str(invoice_date)[:10]
        
        details_data = [
            ['Invoice Number:', order.get('order_number', 'N/A')],
            ['Invoice Date:', invoice_date],
            ['Payment Status:', order.get('payment_status', 'Pending').title()],
        ]
        details_table = Table(details_data, colWidths=[4*cm, 6*cm])
        details_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(details_table)
        elements.append(Spacer(1, 0.5*cm))
        
        # Bill To / Ship To
        shipping_addr = order.get('shipping_address', {})
        if isinstance(shipping_addr, str):
            shipping_text = shipping_addr
        else:
            shipping_text = f"{shipping_addr.get('street', '')}<br/>{shipping_addr.get('city', '')}, {shipping_addr.get('state', '')} {shipping_addr.get('postcode', '')}<br/>{shipping_addr.get('country', 'Australia')}"
        
        bill_ship_data = [
            [Paragraph('<b>Bill To:</b>', styles['Normal']), Paragraph('<b>Ship To:</b>', styles['Normal'])],
            [
                Paragraph(f"{order.get('customer_name', 'N/A')}<br/>{order.get('customer_email', '')}<br/>{order.get('customer_phone', '')}", styles['Normal']),
                Paragraph(shipping_text, styles['Normal'])
            ]
        ]
        bill_ship_table = Table(bill_ship_data, colWidths=[8.5*cm, 8.5*cm])
        bill_ship_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(bill_ship_table)
        elements.append(Spacer(1, 0.5*cm))
        
        # Items table
        items_data = [['Product', 'SKU', 'Qty', 'Unit Price', 'Total']]
        for item in order.get('items', []):
            qty = item.get('quantity', 1)
            price = item.get('price', 0)
            total = qty * price
            items_data.append([
                item.get('name', 'Product'),
                item.get('sku', 'N/A'),
                str(qty),
                f"{currency_symbol}{price:.2f}",
                f"{currency_symbol}{total:.2f}"
            ])
        
        items_table = Table(items_data, colWidths=[6*cm, 3*cm, 2*cm, 3*cm, 3*cm])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.2, 0.2, 0.2)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 0.3*cm))
        
        # Totals
        subtotal = order.get('subtotal', order.get('total', 0))
        shipping = order.get('shipping', 0)
        tax = order.get('tax', subtotal * 0.1)
        total = order.get('total', subtotal + shipping + tax)
        
        totals_data = [
            ['', '', '', 'Subtotal:', f"{currency_symbol}{subtotal:.2f}"],
            ['', '', '', 'Shipping:', f"{currency_symbol}{shipping:.2f}"],
            ['', '', '', 'GST (10%):', f"{currency_symbol}{tax:.2f}"],
            ['', '', '', Paragraph('<b>Total:</b>', styles['Normal']), Paragraph(f"<b>{currency_symbol}{total:.2f}</b>", styles['RightAlign'])],
        ]
        totals_table = Table(totals_data, colWidths=[6*cm, 3*cm, 2*cm, 3*cm, 3*cm])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('LINEABOVE', (3, -1), (-1, -1), 1, colors.black),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(totals_table)
        elements.append(Spacer(1, 1*cm))
        
        # Footer
        if store_email or store_phone:
            footer_text = f"Thank you for your business! | {store_email} | {store_phone}"
            elements.append(Paragraph(footer_text, styles['CenterAlign']))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
    
    @staticmethod
    def generate_quote_pdf(quote: dict, store_settings: dict = None) -> bytes:
        """Generate a quote PDF"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
        
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name='RightAlign', parent=styles['Normal'], alignment=TA_RIGHT))
        styles.add(ParagraphStyle(name='CenterAlign', parent=styles['Normal'], alignment=TA_CENTER))
        
        elements = []
        
        # Store info
        store_name = store_settings.get('store_name', 'TOOLS IN A BOX') if store_settings else 'TOOLS IN A BOX'
        currency_symbol = store_settings.get('currency_symbol', '$') if store_settings else '$'
        
        # Header
        elements.append(Paragraph(f"<b>{store_name}</b>", styles['Heading1']))
        elements.append(Paragraph("<b>QUOTE</b>", styles['Heading2']))
        elements.append(Spacer(1, 0.5*cm))
        
        # Quote details
        quote_date = quote.get('created_at', '')
        if isinstance(quote_date, str):
            try:
                quote_date = datetime.fromisoformat(quote_date.replace('Z', '+00:00')).strftime('%d %b %Y')
            except:
                quote_date = str(quote_date)[:10]
        
        valid_until = quote.get('valid_until', '')
        if isinstance(valid_until, str):
            try:
                valid_until = datetime.fromisoformat(valid_until.replace('Z', '+00:00')).strftime('%d %b %Y')
            except:
                valid_until = str(valid_until)[:10]
        
        details_data = [
            ['Quote Number:', quote.get('quote_number', 'N/A')],
            ['Quote Date:', quote_date],
            ['Valid Until:', valid_until],
            ['Status:', quote.get('status', 'Pending').title()],
        ]
        details_table = Table(details_data, colWidths=[4*cm, 6*cm])
        details_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(details_table)
        elements.append(Spacer(1, 0.5*cm))
        
        # Customer info
        elements.append(Paragraph('<b>Quote For:</b>', styles['Normal']))
        elements.append(Paragraph(f"{quote.get('customer_name', 'N/A')}", styles['Normal']))
        if quote.get('customer_email'):
            elements.append(Paragraph(f"{quote.get('customer_email')}", styles['Normal']))
        if quote.get('customer_phone'):
            elements.append(Paragraph(f"{quote.get('customer_phone')}", styles['Normal']))
        elements.append(Spacer(1, 0.5*cm))
        
        # Items table
        items_data = [['Product', 'SKU', 'Qty', 'Unit Price', 'Total']]
        for item in quote.get('items', []):
            qty = item.get('quantity', 1)
            price = item.get('price', 0)
            total = qty * price
            items_data.append([
                item.get('name', 'Product'),
                item.get('sku', 'N/A'),
                str(qty),
                f"{currency_symbol}{price:.2f}",
                f"{currency_symbol}{total:.2f}"
            ])
        
        items_table = Table(items_data, colWidths=[6*cm, 3*cm, 2*cm, 3*cm, 3*cm])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.2, 0.2, 0.2)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 0.3*cm))
        
        # Totals
        subtotal = quote.get('subtotal', quote.get('total', 0))
        tax = quote.get('tax', subtotal * 0.1)
        total = quote.get('total', subtotal + tax)
        
        totals_data = [
            ['', '', '', 'Subtotal:', f"{currency_symbol}{subtotal:.2f}"],
            ['', '', '', 'GST (10%):', f"{currency_symbol}{tax:.2f}"],
            ['', '', '', Paragraph('<b>Total:</b>', styles['Normal']), Paragraph(f"<b>{currency_symbol}{total:.2f}</b>", styles['RightAlign'])],
        ]
        totals_table = Table(totals_data, colWidths=[6*cm, 3*cm, 2*cm, 3*cm, 3*cm])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (3, 0), (-1, -1), 'RIGHT'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('LINEABOVE', (3, -1), (-1, -1), 1, colors.black),
        ]))
        elements.append(totals_table)
        elements.append(Spacer(1, 1*cm))
        
        # Terms
        elements.append(Paragraph('<b>Terms & Conditions:</b>', styles['Normal']))
        elements.append(Paragraph('• This quote is valid for 30 days from the date of issue', styles['Normal']))
        elements.append(Paragraph('• Prices are subject to change without notice after validity period', styles['Normal']))
        elements.append(Paragraph('• Shipping costs will be calculated at time of order', styles['Normal']))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
    
    @staticmethod
    def generate_packing_slip_pdf(order: dict, store_settings: dict = None) -> bytes:
        """Generate a packing slip PDF for an order"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
        
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name='CenterAlign', parent=styles['Normal'], alignment=TA_CENTER))
        
        elements = []
        
        store_name = store_settings.get('store_name', 'TOOLS IN A BOX') if store_settings else 'TOOLS IN A BOX'
        
        # Header
        elements.append(Paragraph(f"<b>{store_name}</b>", styles['Heading1']))
        elements.append(Paragraph("<b>PACKING SLIP</b>", styles['Heading2']))
        elements.append(Spacer(1, 0.5*cm))
        
        # Order details
        details_data = [
            ['Order Number:', order.get('order_number', 'N/A')],
            ['Order Date:', str(order.get('created_at', ''))[:10]],
        ]
        details_table = Table(details_data, colWidths=[4*cm, 6*cm])
        details_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ]))
        elements.append(details_table)
        elements.append(Spacer(1, 0.5*cm))
        
        # Ship To
        elements.append(Paragraph('<b>Ship To:</b>', styles['Normal']))
        elements.append(Paragraph(f"{order.get('customer_name', 'N/A')}", styles['Normal']))
        shipping = order.get('shipping_address', {})
        if shipping:
            if isinstance(shipping, str):
                elements.append(Paragraph(shipping, styles['Normal']))
            else:
                elements.append(Paragraph(f"{shipping.get('street', '')}", styles['Normal']))
                elements.append(Paragraph(f"{shipping.get('city', '')}, {shipping.get('state', '')} {shipping.get('postcode', '')}", styles['Normal']))
                elements.append(Paragraph(f"{shipping.get('country', 'Australia')}", styles['Normal']))
        elements.append(Spacer(1, 0.5*cm))
        
        # Items table (no prices on packing slip)
        items_data = [['Product', 'SKU', 'Qty', 'Packed']]
        for item in order.get('items', []):
            items_data.append([
                item.get('name', 'Product'),
                item.get('sku', 'N/A'),
                str(item.get('quantity', 1)),
                '☐'
            ])
        
        items_table = Table(items_data, colWidths=[8*cm, 4*cm, 2.5*cm, 2.5*cm])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.Color(0.2, 0.2, 0.2)),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 1*cm))
        
        # Signature line
        elements.append(Paragraph('_' * 40, styles['Normal']))
        elements.append(Paragraph('Packed by: _________________ Date: _________________', styles['Normal']))
        
        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()
