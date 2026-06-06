from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import black, yellow

def create_pdf(filename):
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    # Title
    c.setFont("Helvetica-Bold", 11)
    c.setFillColor(black)
    
    # Draw highlight
    c.setFillColor(yellow)
    c.rect(50, height - 62, 380, 14, fill=1, stroke=0)
    
    c.setFillColor(black)
    c.drawString(50, height - 60, "SPEAK UP SURVEY: SIATech Network Consolidated Reports")
    
    c.setFont("Helvetica", 11)
    
    lines = [
        "",
        "1. California",
        "Job Corps",
        "Independent Study",
        "Community",
        "",
        "2. Arkansas",
        "Job Corps",
        "",
        "3. Florida",
        "Job Corps",
    ]
    
    y = height - 90
    for line in lines:
        c.drawString(50, y, line)
        y -= 15
        
    # Footer
    c.setFont("Helvetica", 9)
    c.drawString(50, 50, "SIATech, Inc. OY Career & College Pathways Program")
    c.drawRightString(width - 50, 50, "Appendix G Page 538")
    
    c.save()

if __name__ == '__main__':
    create_pdf("SPEAK_UP_SURVEY_Transcription.pdf")
