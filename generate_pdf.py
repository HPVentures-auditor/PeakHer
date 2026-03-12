#!/usr/bin/env python3
"""Generate shareable PDFs from the PeakHer core story and slide deck."""

import markdown
from weasyprint import HTML
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CSS = """
@page {
    size: letter;
    margin: 0.75in 1in;
    @top-center { content: "PEAKHER — Confidential"; font-size: 8pt; color: #999; }
    @bottom-center { content: "Page " counter(page); font-size: 8pt; color: #999; }
}
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #1a1a1a;
    max-width: 100%;
}
h1 {
    font-size: 24pt;
    color: #1a1a1a;
    border-bottom: 3px solid #2d6a6a;
    padding-bottom: 8pt;
    margin-top: 24pt;
    page-break-after: avoid;
}
h2 {
    font-size: 18pt;
    color: #2d6a6a;
    margin-top: 20pt;
    border-bottom: 1px solid #ddd;
    padding-bottom: 4pt;
    page-break-after: avoid;
}
h3 {
    font-size: 14pt;
    color: #333;
    margin-top: 16pt;
    page-break-after: avoid;
}
h4 {
    font-size: 12pt;
    color: #555;
    margin-top: 12pt;
    page-break-after: avoid;
}
blockquote {
    border-left: 4px solid #2d6a6a;
    margin: 12pt 0;
    padding: 8pt 16pt;
    background: #f7fafa;
    font-style: italic;
    page-break-inside: avoid;
}
table {
    width: 100%;
    border-collapse: collapse;
    margin: 12pt 0;
    font-size: 10pt;
    page-break-inside: avoid;
}
th {
    background: #2d6a6a;
    color: white;
    padding: 8pt;
    text-align: left;
    font-weight: 600;
}
td {
    padding: 6pt 8pt;
    border-bottom: 1px solid #e0e0e0;
    vertical-align: top;
}
tr:nth-child(even) { background: #f9f9f9; }
strong { color: #1a1a1a; }
em { color: #555; }
code {
    background: #f4f4f4;
    padding: 2pt 4pt;
    border-radius: 3pt;
    font-size: 10pt;
}
pre {
    background: #f4f4f4;
    padding: 12pt;
    border-radius: 4pt;
    overflow-x: auto;
    font-size: 9pt;
    page-break-inside: avoid;
}
hr {
    border: none;
    border-top: 2px solid #2d6a6a;
    margin: 24pt 0;
}
ul, ol {
    margin: 8pt 0;
    padding-left: 24pt;
}
li { margin-bottom: 4pt; }
.cover {
    text-align: center;
    padding-top: 200pt;
    page-break-after: always;
}
.cover h1 {
    font-size: 32pt;
    border: none;
    color: #2d6a6a;
    margin-bottom: 8pt;
}
.cover .subtitle {
    font-size: 14pt;
    color: #666;
    margin-bottom: 40pt;
}
.cover .meta {
    font-size: 11pt;
    color: #999;
    margin-top: 60pt;
}
"""

def md_to_pdf(md_path, pdf_path, title, subtitle=""):
    with open(md_path, 'r') as f:
        md_content = f.read()

    html_body = markdown.markdown(
        md_content,
        extensions=['tables', 'fenced_code', 'toc']
    )

    cover = f"""
    <div class="cover">
        <h1>{title}</h1>
        <div class="subtitle">{subtitle}</div>
        <div class="meta">CONFIDENTIAL<br>Prepared for Internal Review<br>March 2026</div>
    </div>
    """

    full_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>{CSS}</style>
</head>
<body>
{cover}
{html_body}
</body>
</html>"""

    HTML(string=full_html).write_pdf(pdf_path)
    size_kb = os.path.getsize(pdf_path) / 1024
    print(f"Created: {pdf_path} ({size_kb:.0f} KB)")


if __name__ == "__main__":
    output_dir = os.path.join(BASE_DIR, "PDFs")
    os.makedirs(output_dir, exist_ok=True)

    docs = [
        ("CORE_STORY.md", "PeakHer_Core_Story.pdf",
         "PEAKHER",
         "The 5 Reasons High-Performing Women Burn Out<br>(And What the Top Performers Do Differently)"),

        ("CORE_STORY_SLIDE_DECK.md", "PeakHer_Slide_Deck.pdf",
         "PEAKHER — Slide Deck",
         "52-Slide Presentation with Speaker Notes"),

        ("CORE_STORY_QUIZ_ASSESSMENT.md", "PeakHer_Quiz_Assessment.pdf",
         "PEAKHER — Rhythm Assessment",
         "Interactive Self-Assessment Quiz &amp; Lead Magnet"),

        ("CORE_STORY_EMAIL_SEQUENCE.md", "PeakHer_Email_Sequence.pdf",
         "PEAKHER — Email Nurture Sequence",
         "6-Email Series Over 12 Days"),

        ("PRODUCT_SPEC.md", "PeakHer_Product_Spec.pdf",
         "PEAKHER — Product Specification",
         "Complete Product Requirements Document"),

        ("TECHNICAL_ARCHITECTURE.md", "PeakHer_Technical_Architecture.pdf",
         "PEAKHER — Technical Architecture",
         "Database, API, AI Pipeline &amp; Infrastructure"),

        ("RESEARCH_FOUNDATION.md", "PeakHer_Research_Foundation.pdf",
         "PEAKHER — Research Foundation",
         "Scientific Basis, Market Analysis &amp; Competitive Landscape"),

        ("MVP_ROADMAP.md", "PeakHer_MVP_Roadmap.pdf",
         "PEAKHER — MVP Development Roadmap",
         "16-Week Build Plan with User Stories &amp; Technical Decisions"),

        ("LAUNCH_STRATEGY.md", "PeakHer_Launch_Strategy.pdf",
         "PEAKHER — Launch Strategy",
         "Go-to-Market Plan, Partnerships &amp; 90-Day Timeline"),

        ("CONTENT_MARKETING_PLAYBOOK.md", "PeakHer_Content_Playbook.pdf",
         "PEAKHER — Content Marketing Playbook",
         "5 Pillars, 20 Social Posts &amp; SEO Strategy"),

        ("MESSAGING_AND_FAQ.md", "PeakHer_Messaging_FAQ.pdf",
         "PEAKHER — Messaging &amp; FAQ Guide",
         "Objection Handling, Brand Voice &amp; Sound Bites"),
    ]

    for md_file, pdf_file, title, subtitle in docs:
        md_path = os.path.join(BASE_DIR, md_file)
        pdf_path = os.path.join(output_dir, pdf_file)
        if os.path.exists(md_path):
            try:
                md_to_pdf(md_path, pdf_path, title, subtitle)
            except Exception as e:
                print(f"ERROR on {md_file}: {e}")
        else:
            print(f"SKIPPED (not found): {md_file}")

    print(f"\nAll PDFs saved to: {output_dir}")
