from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import shutil
import os
import json

from app.services.ai_service import ask_ai

app = FastAPI(
    title="AI BI Assistant API"
)

# Configure CORS so React (running on 5173) can talk to FastAPI (running on 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_FOLDER = "app/uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Global in-memory cache of the active dataset
stored_df = None
stored_filename = None

@app.get("/")
def home():
    return {
        "status": "online",
        "message": "AI BI Assistant Backend is running."
    }

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    global stored_df, stored_filename

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    file_path = f"{UPLOAD_FOLDER}/{file.filename}"

    # Save uploaded CSV locally
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Load dataset into memory
        stored_df = pd.read_csv(file_path)
        stored_filename = file.filename
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {str(e)}")

    # Classify columns
    numeric_cols = stored_df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = stored_df.select_dtypes(exclude=[np.number]).columns.tolist()

    # Calculate missing values rate
    missing_values = stored_df.isnull().sum().to_dict()
    missing_pct = (stored_df.isnull().sum() / len(stored_df) * 100).to_dict()

    # Calculate global data density metrics
    total_cells = len(stored_df) * len(stored_df.columns)
    total_nulls = int(stored_df.isnull().sum().sum())
    global_null_rate = float((total_nulls / total_cells * 100)) if total_cells > 0 else 0.0
    data_density = float(100.0 - global_null_rate)

    # Compute descriptive stats table (handling categories and numeric data types)
    # Convert NaN to empty string for proper JSON serialization
    desc_df = stored_df.describe(include='all').fillna("")
    describe_dict = desc_df.to_dict()

    # Calculate correlation matrix for numeric columns
    corr_matrix = {}
    if len(numeric_cols) > 1:
        try:
            corr_df = stored_df[numeric_cols].corr().fillna(0)
            corr_matrix = corr_df.to_dict()
        except Exception:
            corr_matrix = {}

    summary = {
        "filename": file.filename,
        "rows": len(stored_df),
        "columns": len(stored_df.columns),
        "column_names": list(stored_df.columns),
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "missing_values": missing_values,
        "missing_percentages": {k: float(v) for k, v in missing_pct.items()},
        "global_null_rate": global_null_rate,
        "data_density": data_density,
        "data_types": stored_df.dtypes.astype(str).to_dict(),
        "describe": describe_dict,
        "correlations": corr_matrix,
        "preview": stored_df.head(50).fillna("").to_dict(orient="records") # Return 50 rows for rich preview grid
    }

    return summary

@app.post("/ask")
async def ask_question(question: str = Form(...)):
    global stored_df

    if stored_df is None:
        raise HTTPException(status_code=400, detail="Please upload a CSV dataset first.")

    # Call AI agent to generate & execute analytics code
    result = ask_ai(question, stored_df)
    
    return result

@app.get("/status")
def get_status():
    global stored_df, stored_filename
    if stored_df is not None:
        return {
            "loaded": True,
            "filename": stored_filename,
            "rows": len(stored_df),
            "columns": len(stored_df.columns)
        }
    return {
        "loaded": False,
        "filename": None,
        "rows": 0,
        "columns": 0
    }
