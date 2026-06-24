from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
from inference import inference_engine

app = FastAPI(title="NeuroScan AI - Inference Service")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow frontend port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "NeuroScan AI Backend is running."}

@app.post("/api/predict")
async def predict(file: UploadFile = File(...)):
    # Placeholder for the actual inference logic
    
    # Save the uploaded file temporarily
    temp_file_path = f"temp_{file.filename}"
    with open(temp_file_path, "wb") as buffer:
        buffer.write(await file.read())

    # Run prediction
    prediction_results = inference_engine.predict(temp_file_path)

    # Cleanup
    if os.path.exists(temp_file_path):
        os.remove(temp_file_path)

    return {
        "status": "success",
        "filename": file.filename,
        "metrics": prediction_results,
        "segmentation_mask_url": "dummy_url"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
