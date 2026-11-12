from pathlib import Path
from typing import List, Dict, Any
from tqdm import tqdm
from docx import Document
import fitz


def chunk_md(size_chunks: int) -> List[Dict[str, Any]]:
    if size_chunks <= 0:
        raise ValueError("size_chunks must be greater than 0")

    docs = Path("Data_RAG")
    if not docs.exists():
        return []

    all_files = []
    for ext in ("*.md", "*.txt", "*.docx", "*.pdf"):
        all_files.extend(list(docs.rglob(ext)))

    lst = []
    overlap = int(size_chunks * 0.4)

    for file in tqdm(all_files, desc="Chunking documents"):
        try:
            text = ""
            ext = file.suffix.lower()

            # Extraction du texte selon l'extension
            if ext in (".md", ".txt"):
                text = file.read_text(encoding="utf-8")
            elif ext == ".docx":
                doc = Document(file)
                text = "\n".join([p.text for p in doc.paragraphs])
            elif ext == ".pdf":
                with fitz.open(file) as pdf_doc:
                    for page in pdf_doc:
                        text += page.get_text()

            if not text.strip():
                continue

            # Logique de découpage d'origine inchangée
            start = 0
            while start < len(text):
                old_start = start
                end = min(start + size_chunks, len(text))

                if end < len(text):
                    while end > start and text[end - 1] not in (" ", "\n"):
                        end -= 1
                    if end == start:
                        end = min(start + size_chunks, len(text))

                bloc = text[start:end]
                if len(bloc.strip()) > 50:
                    lst.append({
                        "file_path": str(file.resolve()),
                        "first_character_index": start,
                        "last_character_index": end
                    })

                if end == len(text):
                    break

                start = max(0, end - overlap)
                while start > 0 and text[start - 1] not in (" ", "\n", "\t"):
                    start -= 1

                if start <= old_start:
                    start = end

        except Exception:
            pass
    return lst