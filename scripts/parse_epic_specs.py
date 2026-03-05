#!/usr/bin/env python3
"""
Epic EHI Tables HTML Specification Parser
Parses Epic's official EHI Tables HTML documentation and generates YAML mapping rules
"""

import re
import json
from pathlib import Path
from bs4 import BeautifulSoup
from typing import Dict, List, Tuple

# Path to Epic EHI Tables specifications
EPIC_SPECS_DIR = Path(r"C:\Users\JonnagadlaR\OneDrive - Cedars-Sinai Health System\EHIgnite_Challenge\Epic EHI Tables\DocGen_su117s2p_2026-02-22_14.10.00")

# Output directory for YAML rules
OUTPUT_DIR = Path(r"C:\Users\JonnagadlaR\OneDrive - Cedars-Sinai Health System\Custom-Apps\EHI_SaaS\frontend\public\rules\epic-tsv")

# Key tables to process (mapping to FHIR resources)
PRIORITY_TABLES = {
    "PATIENT": {"resource": "Patient", "priority": 10, "yaml": "10_patient.yaml"},
    "PAT_ENC": {"resource": "Encounter", "priority": 20, "yaml": "20_encounter.yaml"},
    "PROBLEM_LIST": {"resource": "Condition", "priority": 30, "yaml": "30_condition_problem_list.yaml"},
    "ORDER_MED": {"resource": "MedicationStatement", "priority": 40, "yaml": "40_medication_statement.yaml"},
    "ORDER_PROC": {"resource": "Observation", "priority": 50, "yaml": "50_observation_labs.yaml"},
    "IP_FLWSHT_MEAS": {"resource": "Observation", "priority": 55, "yaml": "55_observation_vitals.yaml"},
    "DOC_INFORMATION": {"resource": "DocumentReference", "priority": 60, "yaml": "60_document_reference.yaml"},
    "ALLERGY": {"resource": "AllergyIntolerance", "priority": 70, "yaml": "70_allergy_intolerance.yaml"},
    "IMMUNE": {"resource": "Immunization", "priority": 80, "yaml": "80_immunization.yaml"},
    "OR_CASE": {"resource": "Procedure", "priority": 90, "yaml": "90_procedure.yaml"},
}


def parse_epic_html_spec(html_path: Path) -> Dict:
    """Parse Epic EHI Table HTML specification and extract metadata and columns"""

    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    soup = BeautifulSoup(html_content, 'html.parser')

    # Extract table name
    table_name = soup.find('table', class_='Header2')
    if table_name:
        table_name = table_name.get_text(strip=True)
    else:
        table_name = html_path.stem

    # Extract description
    description = ""
    desc_td = soup.find('td', class_='T1Value')
    if desc_td:
        desc_parts = []
        for sub_td in desc_td.find_all('td', class_='T1Value'):
            desc_parts.append(sub_td.get_text(strip=True))
        description = " ".join(desc_parts)

    # Extract primary key
    primary_keys = []
    pk_table = soup.find('table', class_='SubHeader3')
    if pk_table and 'Primary Key' in pk_table.get_text():
        next_table = pk_table.find_next_sibling('table')
        if next_table:
            for row in next_table.find_all('tr')[1:]:  # Skip header
                cols = row.find_all('td')
                if cols:
                    primary_keys.append(cols[0].get_text(strip=True))

    # Extract column information
    columns = []
    col_info_header = soup.find('table', class_='SubHeader3')

    if col_info_header:
        for header in soup.find_all('table', class_='SubHeader3'):
            if 'Column Information' in header.get_text():
                col_table = header.find_next_sibling('table')
                if col_table:
                    rows = col_table.find_all('tr')
                    i = 1  # Start after header row
                    while i < len(rows):
                        row = rows[i]
                        cols = row.find_all('td', class_='T1Head')

                        if len(cols) >= 3:
                            col_num = cols[0].get_text(strip=True)
                            col_name = cols[1].get_text(strip=True)
                            col_type = cols[2].get_text(strip=True)

                            # Get description from next row
                            desc = ""
                            if i + 1 < len(rows):
                                desc_row = rows[i + 1]
                                desc_td = desc_row.find('td', style=lambda v: v and 'white-space: normal' in v)
                                if desc_td:
                                    desc = desc_td.get_text(strip=True)

                            columns.append({
                                "ordinal": col_num,
                                "name": col_name,
                                "type": col_type,
                                "description": desc,
                                "is_primary_key": col_name in primary_keys
                            })

                        i += 2  # Move to next column (skip description row)

    return {
        "table_name": table_name,
        "description": description,
        "primary_keys": primary_keys,
        "columns": columns,
        "source_file": html_path.name
    }


def generate_column_summary(spec_dir: Path, table_name: str) -> Dict:
    """Generate summary of columns from Epic specification"""

    html_file = spec_dir / f"{table_name}.htm"

    if not html_file.exists():
        print(f"Warning: {html_file} not found")
        return None

    print(f"Parsing {table_name}.htm...")
    spec = parse_epic_html_spec(html_file)

    return spec


def main():
    """Main function to parse all priority tables and generate summaries"""

    print("Epic EHI Tables Specification Parser")
    print("=" * 60)
    print(f"Source: {EPIC_SPECS_DIR}")
    print(f"Output: {OUTPUT_DIR}")
    print()

    results = {}

    for table_name, config in PRIORITY_TABLES.items():
        spec = generate_column_summary(EPIC_SPECS_DIR, table_name)

        if spec:
            results[table_name] = {
                "spec": spec,
                "config": config,
                "column_count": len(spec["columns"]),
                "fhir_resource": config["resource"]
            }

            print(f"  ✓ {table_name}: {len(spec['columns'])} columns")
            print(f"    Primary Key: {', '.join(spec['primary_keys'])}")
            print(f"    Maps to: {config['resource']}")
            print()

    # Save summary JSON
    summary_file = OUTPUT_DIR / "epic_tables_summary.json"
    with open(summary_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Summary saved to: {summary_file}")
    print(f"\nTotal tables parsed: {len(results)}")
    print(f"Total columns extracted: {sum(r['column_count'] for r in results.values())}")


if __name__ == "__main__":
    main()
