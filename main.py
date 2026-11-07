import argparse
import json
import sys
from generation_llm import run_llm
from bm25 import bm255
from chunks import chunk_md


def save_json(filepath: str, data):
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)


def chunks(size: int, output: str = "data_chunks.json"):
    if size <= 50:
        sys.exit("Erreur : taille minimale de chunk = 51.")
    save_json(output, chunk_md(size_chunks=size))


def bm25(file_data_chunks: str, query: str, output: str = "data_BM25.json"):
    with open(file_data_chunks, "r", encoding="utf-8") as f:
        chunks_data = json.load(f)
    results = bm255(query, chunks_data)
    save_json(output, {"query": query, "results": results})


def reponse_llm(file_data_bm25: str, output_file: str = "data_final.json"):
    print(run_llm(file_data_bm25=file_data_bm25, final_output=output_file))


def agent(
    size: int,
    query: str,
    chunks_file: str = "data_chunks.json",
    bm25_file: str = "data_BM25.json",
    output_file: str = "data_final.json",
):
    if size <= 50:
        sys.exit("Erreur : taille minimale de chunk = 51.")

    chunks_list = chunk_md(size_chunks=size)
    save_json(chunks_file, chunks_list)

    results = bm255(query, chunks_list)
    save_json(bm25_file, {"query": query, "results": results})

    print(run_llm(file_data_bm25=bm25_file, final_output=output_file))


def main():
    parser = argparse.ArgumentParser(description="Pipeline RAG CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    p_chunks = subparsers.add_parser("chunks", help="Génère les chunks")
    p_chunks.add_argument(
        "--size", type=int, required=True, help="Taille des chunks"
    )
    p_chunks.add_argument(
        "--file", type=str, default="data_chunks.json", help="Fichier de sortie"
    )

    p_run = subparsers.add_parser("run", help="Exécute BM25 + LLM")
    p_run.add_argument(
        "--query", type=str, required=True, help="Question utilisateur"
    )
    p_run.add_argument(
        "--file",
        type=str,
        default="data_chunks.json",
        help="Fichier des chunks source",
    )

    p_bm25 = subparsers.add_parser("bm25", help="Exécute uniquement BM25")
    p_bm25.add_argument("file", type=str, help="Fichier source des chunks")
    p_bm25.add_argument("query", type=str, help="Question")

    p_llm = subparsers.add_parser(
        "reponse_llm", help="Exécute uniquement le LLM"
    )
    p_llm.add_argument(
        "file", type=str, help="Fichier des résultats BM25 (ex: data_BM25.json)"
    )

    p_agent = subparsers.add_parser(
        "agent", help="Pipeline complet (Chunks -> BM25 -> LLM)"
    )
    p_agent.add_argument(
        "--size", type=int, required=True, help="Taille des chunks"
    )
    p_agent.add_argument(
        "--query", type=str, required=True, help="Question utilisateur"
    )

    args = parser.parse_args()

    if args.command == "chunks":
        chunks(size=args.size, output=args.file)
    elif args.command == "run":
        bm25(file_data_chunks=args.file, query=args.query, output="data_BM25.json")
        reponse_llm(file_data_bm25="data_BM25.json")
    elif args.command == "bm25":
        bm25(file_data_chunks=args.file, query=args.query)
    elif args.command == "reponse_llm":
        reponse_llm(file_data_bm25=args.file)
    elif args.command == "agent":
        agent(size=args.size, query=args.query)


if __name__ == "__main__":
    main()