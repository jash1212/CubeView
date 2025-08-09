# CubeView

CubeView is a **lightweight data platform** for cataloging, lineage tracking, and running basic data quality checks with built-in anomaly detection using Machine Learning.

---

## 🚀 Features
- 📊 Data cataloging with searchable metadata.
- 🔗 Dataset lineage tracking.
- 🧹 Automated quality checks (null spikes, schema drifts, volume drops).
- 🤖 ML anomaly detection (Isolation Forest).
- 🌐 Responsive React frontend.
- 🔒 Django REST API backend.

---

## 🛠 Tech Stack
React • Django • Python • MySQL • scikit-learn  
Tools: Git, GitHub, REST APIs, VS Code, Postman

---

## ⚡ Quick Setup

# 1️⃣ Clone Repository
git clone https://github.com/jash1212/CubeView.git && cd CubeView

# 2️⃣ Backend Setup
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# 3️⃣ Frontend Setup
cd ../frontend
npm install
npm start

# 4️⃣ Access App
# UI → http://localhost:3000
# API → http://localhost:8000/api/
