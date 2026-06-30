"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../../utils/supabase";
import { motion, AnimatePresence } from "framer-motion";

export default function AIBotButton() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [chatLog, setChatLog] = useState<{ role: string; text: string }[]>([
        {
            role: "bella",
            text: "Hello! I am Bella, your AI concierge. How can I assist you with your booking or styling needs today?",
        },
    ]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Register global window trigger so hero section and other elements can open the bot
    useEffect(() => {
        if (typeof window !== "undefined") {
            (window as any).openBellaAI = () => setIsOpen(true);
        }
        return () => {
            if (typeof window !== "undefined") {
                delete (window as any).openBellaAI;
            }
        };
    }, []);

    // Auto scroll chat
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatLog, loading]);

    if (pathname?.startsWith("/admin")) {
        return null;
    }

    const sendMessage = async (textToSubmit?: string) => {
        const text = textToSubmit || input;
        if (!text.trim()) return;

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
            setChatLog((prev) => [
                ...prev,
                { role: "user", text },
                { role: "bella", text: "Please login first to chat with the AI concierge and book appointments." }
            ]);
            if (!textToSubmit) setInput("");
            return;
        }

        const userMsg = { role: "user", text };
        setChatLog((prev) => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: text,
                    history: chatLog,
                    userId: session.user.id,
                    userEmail: session.user.email,
                    accessToken: session.access_token,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                const serverMsg = (errorData.error || "Failed to get response").replace(/^Error:\s*/i, "");
                setChatLog((prev) => [...prev, { role: "bella", text: serverMsg }]);
                return;
            }

            const data = await response.json();

            if (data.text) {
                setChatLog((prev) => [...prev, { role: "bella", text: data.text }]);
            } else if (data.error) {
                setChatLog((prev) => [...prev, { role: "bella", text: data.error }]);
            }
        } catch (error) {
            console.error("Error:", error);
            setChatLog((prev) => [
                ...prev,
                {
                    role: "bella",
                    text: "Sorry, I encountered an error. Please make sure the backend server is running and configured correctly."
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="w-[320px] sm:w-[380px] h-[500px] bg-[#0D0D0D]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl mb-4 overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E8B88A] to-[#D4A574] flex items-center justify-center text-black font-bold font-sans text-sm">
                                        B
                                    </div>
                                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0A0A0A] animate-pulse" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-sans font-extrabold text-[#E8B88A] tracking-wider uppercase">Bella</h4>
                                    <p className="text-[10px] text-stone-500 font-sans">AI Concierge & Styling Guide</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 text-stone-400 hover:text-white transition-colors duration-200"
                                aria-label="Close chat"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs scrollbar-thin">
                            {chatLog.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                    <div
                                        className={`max-w-[80%] px-4 py-3 rounded-2xl leading-relaxed text-sm ${
                                            msg.role === "user"
                                                ? "bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black font-semibold rounded-tr-none"
                                                : "bg-white/[0.04] border border-white/10 text-stone-200 rounded-tl-none"
                                        }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-white/[0.04] border border-white/10 text-stone-200 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1.5 items-center">
                                        <span className="w-2 h-2 rounded-full bg-stone-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-stone-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-stone-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Quick Prompts */}
                        {chatLog.length === 1 && (
                            <div className="px-4 py-2 flex flex-wrap gap-2 border-t border-white/5 bg-white/[0.01]">
                                {[
                                    "Book a haircut appointment",
                                    "What services do you offer?",
                                    "Tell me about luxury packages"
                                ].map((prompt) => (
                                    <button
                                        key={prompt}
                                        onClick={() => sendMessage(prompt)}
                                        className="text-[10px] text-stone-400 bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1.5 rounded-full transition-all duration-200 hover:text-white"
                                    >
                                        {prompt}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input Footer */}
                        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder="Ask Bella..."
                                className="flex-1 bg-white/[0.05] border border-white/10 rounded-full px-4 py-2.5 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-[#E8B88A]/50 transition-colors"
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={loading}
                                className="p-3 bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black hover:shadow-[0_0_15px_rgba(232,184,138,0.4)] rounded-full transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative group focus:outline-none"
                aria-label="Consult AI Assistant"
            >
                <div className="relative">
                    {/* Glow ring */}
                    <div className="absolute inset-0 bg-[#C69C6D] rounded-full blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-500 scale-110" />
                    {/* Button */}
                    <div className="relative bg-linear-to-br from-[#C69C6D] to-[#A0735B] text-white p-4 rounded-full shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            {isOpen ? (
                                <motion.svg
                                    key="close"
                                    initial={{ rotate: -90, opacity: 0 }}
                                    animate={{ rotate: 0, opacity: 1 }}
                                    exit={{ rotate: 90, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-6 h-6"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M18 6L6 18M6 6l12 12"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </motion.svg>
                            ) : (
                                <motion.svg
                                    key="chat"
                                    initial={{ rotate: 90, opacity: 0 }}
                                    animate={{ rotate: 0, opacity: 1 }}
                                    exit={{ rotate: -90, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="w-6 h-6"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M21 11.5C21 16.194 16.97 20 12 20C10.846 20 9.744 19.796 8.739 19.425L4 21L5.532 17.186C4.584 15.947 4 14.411 4 12.75C4 8.056 8.03 4.25 13 4.25C17.97 4.25 22 8.056 22 12.75"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </motion.svg>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </button>
        </div>
    );
}
