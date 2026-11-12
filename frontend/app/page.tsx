"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Bot, User, Sparkles, RefreshCw, Check, Plus, Upload, X, FileText } from "lucide-react";

interface Passage {
  text: string;
  chunk: {
    file_path: string;
    first_character_index: number;
    last_character_index: number;
  };
}

interface Message {
  role: "user" | "assistant";
  content: string;
  results?: Passage[];
}

function Answer({ message }: { message: Message }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const results = message.results ?? [];
  const parts = message.content.split(/(\[S[1-9]\d*\])/g);

  return (
    <>
      <p className="whitespace-pre-wrap">
        {parts.map((part, i) => {
          if (i % 2 === 0) return part;
          const index = Number(part.slice(2, -1)) - 1;
          if (!results[index]?.text) return part;
          return (
            <button key={i} className="text-blue-300 hover:underline"
              aria-label={`Afficher la source S${index + 1}`}
              onClick={() => { setSelected(index); setOpen(true); }}>
              {part}
            </button>
          );
        })}
      </p>
      {results.length > 0 && (
        <button className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-white"
          aria-expanded={open}
          onClick={() => { setOpen(!open || selected !== null); setSelected(null); }}>
          <FileText size={13} /> Sources ({results.length})
        </button>
      )}
      {open && (
        <div className="mt-2 space-y-3 border-t border-zinc-700 pt-2">
          {results.map((source, i) => {
            if (selected !== null && selected !== i) return null;
            return (
              <section key={i} className="text-xs">
                <strong>[S{i + 1}] {source.chunk.file_path.split(/[\\/]/).pop()}</strong>
                <p className="text-zinc-400">Caractères {source.chunk.first_character_index} à {source.chunk.last_character_index}</p>
                <blockquote className="mt-1 whitespace-pre-wrap break-words">{source.text}</blockquote>
              </section>
            );
          })}
          <button className="text-xs text-zinc-400 hover:text-white" onClick={() => setOpen(false)}>Fermer</button>
        </div>
      )}
    </>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // États pour la synchronisation et le modal d'upload
  const [isReloading, setIsReloading] = useState(false);
  const [reloadSuccess, setReloadSuccess] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleReloadDatabase = async () => {
    if (isReloading) return;
    setIsReloading(true);
    setReloadSuccess(false);

    try {
      const res = await fetch("http://localhost:8000/api/reload", {
        method: "POST",
      });
      if (res.ok) {
        setReloadSuccess(true);
        setTimeout(() => setReloadSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Erreur lors du rechargement", err);
    } finally {
      setIsReloading(false);
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile || isUploading) return;
    setIsUploading(true);
    setUploadStatus("idle");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setUploadStatus("success");
        setTimeout(() => {
          setIsModalOpen(false);
          setSelectedFile(null);
          setUploadStatus("idle");
        }, 1500);
      } else {
        setUploadStatus("error");
      }
    } catch (err) {
      console.error("Erreur d'upload", err);
      setUploadStatus("error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage },
      { role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await response.json();

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          results: Array.isArray(data.results) ? data.results : [],
          content: data.response || "Aucune réponse générée.",
        };
        return updated;
      });
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Erreur de connexion au backend RAG.",
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex h-screen bg-[#08080a] text-zinc-100 font-sans antialiased overflow-hidden selection:bg-zinc-800 selection:text-zinc-200">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-blue-500/5 blur-[160px] pointer-events-none rounded-full" />

      <div className="flex flex-col w-full max-w-3xl mx-auto h-full z-10 px-4">
        
        {/* Header avec indicateur et boutons */}
        <header className="py-5 border-b border-zinc-800/40 bg-[#08080a]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center space-x-2.5">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
            <span className="text-xs font-medium tracking-tight text-zinc-400 tracking-widest">
              advanced-hybrid-RAG
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Bouton pour ouvrir le Modal d'Ajout */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/60 px-3 py-1 rounded-full text-xs text-zinc-300 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[11px]">Ajouter un fichier</span>
            </button>

            {/* Bouton de Synchronisation */}
            <button
              onClick={handleReloadDatabase}
              disabled={isReloading}
              title="Recharger la base"
              className="flex items-center gap-1.5 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/60 px-3 py-1 rounded-full text-xs text-zinc-300 transition-all cursor-pointer disabled:opacity-50"
            >
              {reloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] text-emerald-400">Rechargé</span>
                </>
              ) : (
                <>
                  <RefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${isReloading ? "animate-spin" : ""}`} />
                  <span className="text-[11px]">Sync docs</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Zone des messages */}
        <div className="flex-1 overflow-y-auto py-8 space-y-6 scrollbar-none">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 my-auto">
              <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm">
                <Sparkles className="w-6 h-6 text-zinc-400" />
              </div>
              <div className="max-w-sm space-y-1">
                <h3 className="text-sm font-medium text-zinc-200">advanced-hybrid-RAG</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Exploitez et synthétisez vos sources en temps réel grâce à votre moteur neuronal local.
                </p>
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`flex gap-3.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-zinc-100 text-zinc-900 font-medium rounded-tr-xs"
                      : "bg-zinc-900/60 border border-zinc-800/60 text-zinc-200 rounded-tl-xs backdrop-blur-md"
                  }`}
                >
                  {m.role === "assistant" && !m.content && isLoading ? (
                    <div className="flex items-center gap-2.5 py-1 text-xs text-zinc-500 font-mono">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                      <span>Recherche documentaire & génération...</span>
                    </div>
                  ) : (
                    m.role === "assistant" ? <Answer message={m} /> : <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>

                {m.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Barre de saisie */}
        <footer className="pb-6 pt-2 bg-gradient-to-t from-[#08080a] via-[#08080a]/90 to-transparent">
          <div className="relative flex items-center bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-2 shadow-2xl focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-zinc-700/50 transition-all backdrop-blur-xl">
            <input
              type="text"
              className="flex-1 bg-transparent border-0 px-3 py-2 text-sm focus:outline-none placeholder-zinc-500 text-zinc-100"
              placeholder="Posez votre question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-zinc-100 hover:bg-white disabled:opacity-20 text-zinc-900 p-2 rounded-xl transition-all duration-200 flex items-center justify-center shrink-0 cursor-pointer"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </footer>

      </div>

      {/* Modal de téléversement de fichier */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl text-zinc-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-medium">Ajouter un document (.md, .txt, .docx, .pdf)</h3>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-700 hover:border-zinc-500 rounded-xl cursor-pointer bg-zinc-950/50 hover:bg-zinc-950 transition-all">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                    <Upload className="w-6 h-6 text-zinc-400 mb-2" />
                    <p className="text-xs text-zinc-400">
                      {selectedFile ? selectedFile.name : "Cliquez ou glissez un fichier (.md, .txt, .docx, .pdf)"}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept=".md,.txt,.docx,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>

                {uploadStatus === "success" && (
                  <p className="text-xs text-emerald-400 text-center font-medium">
                    ✅ Document importé et indexé avec succès !
                  </p>
                )}
                {uploadStatus === "error" && (
                  <p className="text-xs text-red-400 text-center font-medium">
                    ❌ Erreur lors de l'envoi du fichier.
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs rounded-xl border border-zinc-800 hover:bg-zinc-800 text-zinc-400"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleUploadFile}
                    disabled={!selectedFile || isUploading}
                    className="px-4 py-2 text-xs rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {isUploading && <RefreshCw className="w-3 h-3 animate-spin" />}
                    <span>Importer</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </main>
  );
}