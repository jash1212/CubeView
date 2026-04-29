<<<<<<< HEAD
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
=======
# CubeView 🚀

**CubeView** is a Data Observability and Metadata Intelligence platform designed to help teams monitor, understand, and trust their data systems.

It enables proactive monitoring of data quality, incident detection, metadata management, lineage tracking, and AI-assisted insights — all through a unified, production-ready dashboard.

---

## 🎯 Problem Statement

Modern data systems fail silently.

* Tables stop updating
* Schemas change without notice
* Fields start returning null values
* Data volume suddenly spikes or drops
* ETL jobs fail silently

CubeView solves this by continuously monitoring your data systems and generating actionable insights before small issues become production problems.

---

## ✨ Core Features

### 📊 Data Health Dashboard

* Weighted Health Score System
* Real-time incident summary
* Field-level health monitoring
* Trend visualization with anomaly detection
* Smooth animated UI (Framer Motion)

---

### 🔎 Data Quality Checks

CubeView supports multiple check types:

* Volume Check
* Freshness Check
* Field Health Check
* Schema Drift Detection
* Job Failure Detection
* Custom Rules

Each check contributes to the overall health score and generates structured incidents.

---

### 🚨 Incident Management System

* Paginated incident listing
* Color-coded incident types
* Field-level incident view
* Distribution charts (pie / timeline)
* Refresh & filtering support
* ML-based anomaly detection

---

### 🧠 AI-Powered Rule Engine

* Manual rule creation
* AI-assisted rule generation
* Edit / Delete support
* Backend-integrated rule execution
* Custom thresholds & validations

---

### 🗂 Metadata Intelligence

* Automatic database table detection
* PostgreSQL metadata sync
* Tagging system
* AI-generated table documentation
* Metadata export support

---

### 🔗 Data Lineage (Production-Ready Model)

* Table-level lineage
* Designed for field-level lineage extension
* Dependency graph visualization
* Scalable architecture

---

## 🏗 Architecture

Frontend (Next.js)
↓
Backend API (Django)
↓
PostgreSQL
>>>>>>> c0f8cf48762d86634cffca7ba6ee6fd8c10e28f1

---

## 🛠 Tech Stack
<<<<<<< HEAD
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
=======

### Frontend

* Next.js
* React
* Tailwind CSS
* Framer Motion
* ShadCN UI

### Backend

* Django
* Django REST Framework
* PostgreSQL

---



---

## 🚀 Getting Started

### 1️⃣ Clone the repository

```
git clone https://github.com/jash1212/CubeView.git
cd CubeView
```

### 2️⃣ Backend Setup

```
cd cubeview_backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 3️⃣ Frontend Setup

```
cd Cubeview
npm install
npm run dev
```

---

## 🧮 Health Score Logic

CubeView calculates a weighted health score based on:

* Volume weight
* Freshness weight
* Field health weight
* Schema drift weight
* Job failure weight

The score dynamically updates based on incident severity and frequency.

---

## 📌 Roadmap

* Field-level lineage visualization
* Advanced ML anomaly detection
* Slack/Email alerts
* Multi-database support
* Role-based access control
* PDF export with AI insights

---
>>>>>>> c0f8cf48762d86634cffca7ba6ee6fd8c10e28f1

