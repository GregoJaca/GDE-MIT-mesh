import json
import os
import sys
import argparse
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
from markdownify import markdownify as md

try:
    import pdfkit
except ImportError:
    print("Error: 'pdfkit' is required to generate PDFs.")
    print("Please install it by running: pip install pdfkit jinja2")
    sys.exit(1)

# ==============================================================================
# CONFIGURATION
# ==============================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, 'config', 'formats.json')
TEMPLATES_DIR = os.path.join(BASE_DIR, 'templates')

def load_formats():
    """Load the format configurations and template mappings."""
    if not os.path.exists(CONFIG_PATH):
        print(f"Error: Config file missing at {CONFIG_PATH}")
        sys.exit(1)
    
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        config = json.load(f)
    return config.get('formats', {})


# ==============================================================================
# GENERATION ENGINE
# ==============================================================================
def generate_report(json_file_path, format_id, output_path):
    """
    Renders an HTML template using Jinja2 and converts it to PDF via pdfkit.
    """
    formats = load_formats()
    
    if format_id not in formats:
        print(f"Error: Format ID '{format_id}' not found in configuration.")
        return False
        
    # 1. Load the Patient JSON Data
    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading patient JSON file: {e}")
        return False
        
    # 2. Extract specific segments 
    universal_header = data.get('universal_header', {})
    
    # Check for the new dynamic_parameters JSON structure first, otherwise fall back to dynamic_data.
    if 'dynamic_parameters' in data and 'standard_clinical' in data['dynamic_parameters']:
        dynamic_data = data['dynamic_parameters']['standard_clinical']
    else:
        dynamic_data = data.get('dynamic_data', data)
    
    # 3. Setup Jinja2 Environment
    env = FileSystemLoader(TEMPLATES_DIR)
    jinja_env = Environment(loader=env)
    
    # 4. Load the appropriate template
    template_filename = formats[format_id].get('template_file')
    if not template_filename:
        print(f"Error: No template file mapped for format '{format_id}'")
        return False
        
    try:
        template = jinja_env.get_template(template_filename)
    except Exception as e:
        print(f"Error loading template '{template_filename}' from {TEMPLATES_DIR}: {e}")
        return False
        
    # 5. Render HTML
    rendered_html = template.render(
        report_title=formats[format_id]['format_name'],
        current_date=datetime.now().strftime("%B %d, %Y - %H:%M"),
        universal_header=universal_header,
        dynamic_data=dynamic_data
    )
    
    # 6. Convert HTML to PDF using pdfkit (which requires wkhtmltopdf)
    # Important settings to prevent it from failing on complex CSS/assets
    options = {
        'page-size': 'Letter',
        'margin-top': '0.75in',
        'margin-right': '0.75in',
        'margin-bottom': '0.75in',
        'margin-left': '0.75in',
        'encoding': "UTF-8",
        'enable-local-file-access': ""
    }
    
    try:
        # Search for wkhtmltopdf binary
        # Default typical paths for Windows Winget/Installer + Local Extraction
        paths = [
            r'C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe',
            r'C:\Program Files (x86)\wkhtmltopdf\bin\wkhtmltopdf.exe',
            os.path.join(BASE_DIR, '..', 'wkhtmltopdf_bin', 'wkhtmltox', 'bin', 'wkhtmltopdf.exe')
        ]
        
        config = None
        for p in paths:
            if os.path.exists(p):
                config = pdfkit.configuration(wkhtmltopdf=p)
                break
                
        if config:
            pdfkit.from_string(rendered_html, output_path, options=options, configuration=config)
        else:
            # Assumes it's in the system PATH
            pdfkit.from_string(rendered_html, output_path, options=options)
            
        print(f"Success! Beautiful PDF generated at: {os.path.abspath(output_path)}")
        
        # 7. Convert HTML to clean Markdown and save it alongside the PDF
        md_output_path = os.path.splitext(output_path)[0] + ".md"
        markdown_text = md(rendered_html, heading_style="ATX", autolinks=False)
        with open(md_output_path, "w", encoding="utf-8") as f:
            f.write(markdown_text)
            
        print(f"Success! Beautiful Markdown generated at: {os.path.abspath(md_output_path)}")
        
        return True
    except Exception as e:
        print(f"Failed to generate files. {e}")
        return False


# ==============================================================================
# ENTRY POINT
# ==============================================================================
def interactive_menu():
    formats = load_formats()
    print("=" * 50)
    print(" Beautiful Medical Report PDF Generator ")
    print("=" * 50)
    
    json_path = input("\nEnter path to patient JSON file: ").strip()
    if not os.path.exists(json_path):
        print("Error: File not found.")
        sys.exit(1)
        
    print("\nAvailable Designer Formats:")
    for f_id, f_data in formats.items():
        print(f"[{f_id}] {f_data['format_name']}")
        
    format_choice = input("\nEnter format ID: ").strip()
    
    output_path = input("Enter output PDF filename [default: output.pdf]: ").strip()
    if not output_path:
        output_path = "output.pdf"
        
    if not output_path.endswith('.pdf'):
        output_path += '.pdf'
        
    generate_report(json_path, format_choice, output_path)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        parser = argparse.ArgumentParser(description="Generate styled Medical PDF reports.")
        parser.add_argument("json_file", help="Path to patient data JSON file")
        parser.add_argument(
            "--format", "-f",
            required=True,
            help="Format ID from config/formats.json (e.g. fmt_001)"
        )
        parser.add_argument("--output", "-o", default="output.pdf", help="Output PDF file path")
        args = parser.parse_args()
        
        generate_report(args.json_file, args.format, args.output)
    else:
        interactive_menu()
