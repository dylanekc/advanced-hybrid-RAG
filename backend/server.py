from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
import shutil

from chunks import chunk_md
from bm25 import bm255
from generation_llm import run_llm

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = "./Data_RAG"
CHUNK_SIZE = 500
CHUNKS_CACHE = []

@app.on_event("startup")
def startup_event():
    global CHUNKS_CACHE
    CHUNKS_CACHE = chunk_md(size_chunks=CHUNK_SIZE)
    print(f"🚀 Serveur prêt : {len(CHUNKS_CACHE)} chunks chargés.")

class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    global CHUNKS_CACHE
    try:
        if not CHUNKS_CACHE:
            CHUNKS_CACHE = chunk_md(size_chunks=CHUNK_SIZE)

        results = bm255(request.message, CHUNKS_CACHE, top_k_bm25=20, top_k_final=5)
        
        with open("data_BM25.json", "w", encoding="utf-8") as f:
            json.dump({"query": request.message, "results": results}, f, ensure_ascii=False, indent=4)
            
        answer = run_llm(file_data_bm25="data_BM25.json", final_output="data_final.json")
        return {"response": answer, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reload")
def reload_database():
    global CHUNKS_CACHE
    try:
        CHUNKS_CACHE = chunk_md(size_chunks=CHUNK_SIZE)
        print(f"🔄 Rechargement réussi : {len(CHUNKS_CACHE)} chunks.")
        return {"status": "success", "count": len(CHUNKS_CACHE)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/upload")
def upload_file(file: UploadFile = File(...)):
    global CHUNKS_CACHE
    allowed_extensions = (".md", ".txt", ".docx", ".pdf")
    if not file.filename.lower().endswith(allowed_extensions):
        raise HTTPException(status_code=400, detail="Formats acceptés : .md, .txt, .docx, .pdf")
    
    os.makedirs(DATA_DIR, exist_ok=True)
    file_path = os.path.join(DATA_DIR, file.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        CHUNKS_CACHE = chunk_md(size_chunks=CHUNK_SIZE)
        print(f"✅ Fichier '{file.filename}' ajouté. Total : {len(CHUNKS_CACHE)} chunks.")
        return {"status": "success", "filename": file.filename, "total_chunks": len(CHUNKS_CACHE)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))