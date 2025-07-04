import requests

API_KEY = "AIzaSyBKlX-7TfuOJnZo-ZjnQTyUYtQXfih6qqw"  # Replace with your real key
MODEL = "gemini-1.5-flash"       # Or use "gemini-1.5-pro" if available
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent"

headers = {
    "Content-Type": "application/json",
    "X-goog-api-key": API_KEY,
}

data = {
    "contents": [
        {
            "parts": [
                {"text": "Explain how AI works in a few words"}
            ]
        }
    ]
}

response = requests.post(URL, headers=headers, json=data)

if response.status_code == 200:
    result = response.json()
    print("Response:", result["candidates"][0]["content"]["parts"][0]["text"])
else:
    print("Error:", response.status_code, response.text)
