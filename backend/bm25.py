from rapidfuzz import process, fuzz
import re
from typing import Dict, Any
import bm25s
from sentence_transformers import CrossEncoder

def clear_text(texte: str) -> str:
    if not texte:
        return ""
    texte = re.sub(r"\n+", "\n", texte)
    texte = re.sub(r"[ \t]+", " ", texte)
    return texte.strip()

def extract_text(source: Dict[str, Any]) -> str:
    try:
        with open(source["file_path"], "r", encoding="utf-8") as s:
            text = s.read()
            start = int(source["first_character_index"])
            end = int(source["last_character_index"])
            return clear_text(text[start:end])
    except Exception:
        return ""

def correct_query_with_rapidfuzz(query: str, corpus_texts: list[str], score_cutoff: float = 75.0) -> str:
    """Corrige les fautes d'une requête en s'appuyant uniquement sur le vocabulaire du corpus."""
    vocab = set(re.findall(r"\w+", " ".join(corpus_texts).lower()))
    words = re.findall(r"\w+", query.lower())
    corrected_words = []
    
    for word in words:
        if word in vocab or len(word) <= 3:
            corrected_words.append(word)
        else:
            match = process.extractOne(word, vocab, scorer=fuzz.ratio, score_cutoff=score_cutoff)
            corrected_words.append(match[0] if match else word)
            
    return " ".join(corrected_words)

# Initialisation du CrossEncoder (CamemBERT)
ranker = CrossEncoder("antoinelouis/crossencoder-camembert-base-mmarcoFR")

def bm255(query: str, source: list, top_k_bm25=20, top_k_final=5):

    valid_data = [(txt, chunk) for chunk in source if (txt := extract_text(chunk)).strip()]
    if not valid_data:
        print("❌ Erreur : Aucun texte valide n'a pu être extrait.")
        return []

    corpus, source_filtered = map(list, zip(*valid_data))

    fuzzy_query = correct_query_with_rapidfuzz(query, corpus)
    
    retriever = bm25s.BM25(method="lucene", k1=1.5, b=0.5)
    retriever.index(bm25s.tokenize(corpus, stopwords="fr"))

    results, _ = retriever.retrieve(
        bm25s.tokenize(fuzzy_query, stopwords="fr"), 
        k=min(top_k_bm25, len(corpus))
    )

    # 3. Construction des candidats & Reranking Cross-Encoder
    candidates = [{"text": corpus[idx], "chunk": source_filtered[idx]} for idx in results[0]]

    if candidates:
        scores = ranker.predict([[query, c["text"]] for c in candidates])
        for c, score in zip(candidates, scores):
            c["score"] = float(score)
        candidates.sort(key=lambda x: x["score"], reverse=True)

    # 4. Formatage final et retour direct (Python gère nativement les slices plus grands que la liste)
    return [
        {"score": c["score"], "text": c["text"], "chunk": c["chunk"]}
        for c in candidates[:top_k_final]
    ]