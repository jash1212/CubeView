# 📦 CubeView

CubeView is a **lightweight data platform** for **cataloging**, **lineage tracking**, and running **data quality checks** with built-in **ML-based anomaly detection**.

---

## 🚀 Features
- 📊 **Data Cataloging** – searchable metadata for datasets.
- 🔗 **Lineage Tracking** – trace relationships between datasets.
- 🧹 **Automated Checks** – null spikes, schema drifts, volume drops.
- 🤖 **Anomaly Detection** – Isolation Forest ML model.
- 🌐 **Responsive UI** – React frontend with modern design.
- 🔒 **Secure API** – Django REST API backend.

---

## 🛠 Tech Stack
**Frontend:** React  
**Backend:** Django (Python)  
**Database:** MySQL  
**ML:** scikit-learn  
**Tools:** Git, GitHub, REST APIs, VS Code, Postman

---

## ⚡ Quick Setup


### 1️⃣ Clone Repository
```bash
git clone https://github.com/jash1212/CubeView.git && cd CubeView

Backend Setup
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

Frontend Setup
cd ../frontend
npm install
npm start

