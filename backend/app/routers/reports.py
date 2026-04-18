from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from ..database import get_db
from ..models import UserModel, TransactionModel, BudgetModel
from ..auth import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])

def get_report_styles():
    styles = getSampleStyleSheet()
    # Explicitly add the 'Small' style that was missing in the backend logs
    if 'Small' not in styles:
        styles.add(ParagraphStyle(
            name='Small',
            parent=styles['Normal'],
            fontSize=8,
            leading=10,
            textColor=colors.grey
        ))
    return styles

@router.get("/monthly-pdf")
def generate_monthly_pdf(
    month: int = Query(datetime.utcnow().month),
    year: int = Query(datetime.utcnow().year),
    db: Session = Depends(get_db),
    user: UserModel = Depends(get_current_user)
):
    """Generates a professional institutional PDF Monthly Summary Report."""
    
    try:
        # 1. Data Aggregation
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)

        # Fetch Transactions
        transactions = db.query(TransactionModel).filter(
            TransactionModel.user_id == user.id,
            TransactionModel.txn_date >= start_date,
            TransactionModel.txn_date < end_date
        ).order_by(TransactionModel.txn_date.desc()).all()

        # Calculate Summary
        income = db.query(func.sum(TransactionModel.amount)).filter(
            TransactionModel.user_id == user.id,
            TransactionModel.txn_type == 'credit',
            TransactionModel.txn_date >= start_date,
            TransactionModel.txn_date < end_date
        ).scalar() or 0.0

        expense = db.query(func.sum(TransactionModel.amount)).filter(
            TransactionModel.user_id == user.id,
            TransactionModel.txn_type == 'debit',
            TransactionModel.txn_date >= start_date,
            TransactionModel.txn_date < end_date
        ).scalar() or 0.0

        # 2. PDF Creation
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
        elements = []
        styles = get_report_styles()

        # Header
        elements.append(Paragraph(f"DigitalBank Pro - Executive Audit Statement", styles['Heading1']))
        elements.append(Paragraph(f"Period: {start_date.strftime('%B %Y')}", styles['Normal']))
        elements.append(Paragraph(f"Account Holder: {user.name}", styles['Normal']))
        elements.append(Spacer(1, 20))

        # Summary Table
        summary_data = [
            ["Metric", "Value"],
            ["Total Inflow", f"INR {income:,.2f}"],
            ["Total Outflow", f"INR {abs(expense):,.2f}"],
            ["Net Savings", f"INR {(income - abs(expense)):,.2f}"]
        ]
        summary_table = Table(summary_data, colWidths=[200, 200])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.black),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 30))

        # Transaction Table
        elements.append(Paragraph("Detailed Transaction Log", styles['Heading2']))
        txn_data = [["Date", "Entity", "Category", "Amount"]]
        for t in transactions:
            txn_data.append([
                t.txn_date.strftime("%Y-%m-%d"),
                t.merchant[:20],
                t.category,
                f"{'+' if t.txn_type == 'credit' else '-'}{t.amount:,.2f}"
            ])

        if len(transactions) > 0:
            t_table = Table(txn_data, colWidths=[80, 150, 100, 100])
            t_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('LINEBELOW', (0, 0), (-1, 0), 1, colors.black),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
                ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ]))
            elements.append(t_table)
        else:
            elements.append(Paragraph("No transactions recorded for this period.", styles['Italic']))

        # Footer
        elements.append(Spacer(1, 40))
        footer_text = f"Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} - Institutional Banking Node"
        elements.append(Paragraph(footer_text, styles['Small']))

        doc.build(elements)
        buffer.seek(0)
        
        filename = f"Audit_{user.name.replace(' ', '_')}_{year}_{month}.pdf"
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF Generation Failed: {str(e)}")
