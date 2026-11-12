import json
import ollama


def run_llm(
    file_data_bm25: str = "data_BM25.json",
    final_output: str = "data_final.json",
    model_name: str = "qwen2.5:7b",
) -> str:
    with open(file_data_bm25, "r", encoding="utf-8") as f:
        data = json.load(f)

    user_query = data.get("query", "")
    results_bm25 = data.get("results", [])

    context_text_bm25 = "\n\n".join(
        [
            f'[S{index + 1}]\n{item["text"]}'
            for index, item in enumerate(results_bm25)
            if "text" in item
        ]
    )

    if not context_text_bm25.strip():
        answer = "Aucun document pertinent trouvé dans la base."

    else:
        messages = [
            {
                "role": "system",
                "content": (
                    "Tu es un assistant RAG en français. "
                    "Réponds à la question en te basant EXCLUSIVEMENT sur les documents fournis ci-dessous. "
                    "Si la réponse n'y est pas, dis clairement que tu ne sais pas. "
                    "Si une règle dépend d'une condition (ex: température, rôle, état du matériel), évalue d'abord la condition puis donne la conclusion logique directe. "
                    "Cite les passages qui justifient tes affirmations avec leurs identifiants [S1], [S2], etc. "
                    "Utilise uniquement les identifiants présents dans les documents fournis. "
                    "Si tu ne sais pas répondre, n'ajoute aucune citation."
                ),
            },
            {
                "role": "user",
                "content": f"Documents de référence :\n{context_text_bm25}\n\nQuestion : {user_query}",
            },
        ]
        response = ollama.chat(model=model_name, messages=messages)
        answer = response["message"]["content"].strip()

    output_data = {
        "query": user_query,
        "context": context_text_bm25,
        "results": results_bm25,
        "reponse": answer,
    }

    with open(final_output, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=4, ensure_ascii=False)

    return answer