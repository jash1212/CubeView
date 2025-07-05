import requests
import os

GEMINI_API_KEY = os.getenv("API_KEY")
MODEL = "gemini-1.5-flash"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

def generate_table_documentation(table_name, column_names):
    prompt = (
    f"Write clean, human-friendly documentation for a table named '{table_name}', "
    f"which has the following columns:\n\n"
    f"{chr(10).join(f'- {col}' for col in column_names)}\n\n"
    "Describe what the table is likely used for, and what each column means."
)

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
