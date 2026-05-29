# AI-Powered Business Intelligence Assistant

## Features
- CSV Upload
- AI Insights
- Streamlit Dashboard
- FastAPI Backend
- Automatic Charts

## Backend Setup

cd backend

python -m venv .venv

### Windows
.venv\Scripts\activate

### Mac/Linux
source .venv/bin/activate

pip install -r requirements.txt

Create .env file from .env.example

Run:
uvicorn app.main:app --reload

## Frontend Setup

cd frontend

pip install -r requirements.txt

Run:
streamlit run app.py

## URLs

Backend:
http://127.0.0.1:8000

Swagger:
http://127.0.0.1:8000/docs

Frontend:
http://localhost:8501
