import requests
import os

GEMINI_API_KEY = os.getenv("API_KEY")
MODEL = "gemini-2.5-pro"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

def generate_table_documentation(table_name, column_names):
    prompt = f"""
You are a professional data documentation expert tasked with creating
clear, business-friendly documentation for a database table.

Table Name: {table_name}

Columns:
{chr(10).join(f"- {col}" for col in column_names)}

Your goal:
1. Write a short, human-readable overview of the table’s purpose and likely use cases.
2. For each column, give a one-sentence description of what it likely represents,
   keeping it simple and avoiding unnecessary technical jargon.
3. If a column name is ambiguous, provide your best guess based on common naming patterns.
4. Avoid filler phrases like "This column stores data".
5. Keep the tone concise, professional, and easy for non-technical stakeholders to understand.

Format your response as:

## Table Overview
[One paragraph overview]

## Column Descriptions
- column_name: description
- column_name: description
"""

    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": GEMINI_API_KEY,
    }

    data = {
        "contents": [
            {
                "parts": [{"text": prompt}]
            }
        ]
    }

    try:
        response = requests.post(URL, headers=headers, json=data)
        if response.status_code == 200:
            result = response.json()

            text_output = ""
            if "candidates" in result and result["candidates"]:
                parts = result["candidates"][0].get("content", {}).get("parts", [])
                for p in parts:
                    if "text" in p:
                        text_output += p["text"] + "\n"

            if text_output.strip():
                return text_output.strip()

        # === If Gemini failed or empty, fallback to auto-generation ===
        auto_doc = f"""## Table Overview
This table, **{table_name}**, stores structured information with {len(column_names)} fields.  

## Column Descriptions
"""
        for col in column_names:
            if "id" in col.lower():
                desc = "Unique identifier for the record."
            elif "name" in col.lower():
                desc = "Name or label associated with the record."
            elif "date" in col.lower() or "time" in col.lower():
                desc = "Date/time information related to the record."
            elif "email" in col.lower():
                desc = "Email address field."
            elif "status" in col.lower():
                desc = "Current state or condition of the record."
            elif "count" in col.lower() or "num" in col.lower():
                desc = "Numeric value or quantity field."
            else:
                desc = "General attribute of the record."
            auto_doc += f"- {col}: {desc}\n"

        return auto_doc.strip()

    except Exception:
        # Final safe fallback: still auto-generate docs
        auto_doc = f"""## Table Overview
This table, **{table_name}**, stores structured information with {len(column_names)} fields.  

## Column Descriptions
"""
        for col in column_names:
            auto_doc += f"- {col}: General attribute of the record.\n"

        return auto_doc.strip()
