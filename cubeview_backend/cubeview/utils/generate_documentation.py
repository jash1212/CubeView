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
                "parts": [
                    {"text": prompt}
                ]
            }
        ]
    }

    try:
        response = requests.post(URL, headers=headers, json=data)
        if response.status_code == 200:
            result = response.json()
            return result["candidates"][0]["content"]["parts"][0]["text"]
        else:
            return f"Error generating documentation: {response.status_code} - {response.text}"
    except Exception as e:
        return f"Error generating documentation: {str(e)}"
