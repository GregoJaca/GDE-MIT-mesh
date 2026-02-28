import os
import subprocess

formats = ["fmt_001", "fmt_002", "fmt_003", "fmt_004", "fmt_005"]
base_dir = "app/report_generator"
output_dir = "outputs/examples"
os.makedirs(output_dir, exist_ok=True)

for fmt in formats:
    output_path = f"{output_dir}/example_{fmt}.pdf"
    print(f"Generating {output_path}...")
    cmd = [
        "uv", "run", "python",
        f"{base_dir}/generate_report.py",
        "master_sample.json",
        "--format", fmt,
        "--output", output_path
    ]
    subprocess.run(cmd, check=True)

print("\nDone! Examples generated in backend/outputs/examples/")
