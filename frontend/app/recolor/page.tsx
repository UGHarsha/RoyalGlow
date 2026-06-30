"use client";
import { useState } from "react";
import { Upload, Sparkles, Sliders, RefreshCw, Check, ArrowRight, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Recolor() {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [color, setColor] = useState("dark brown");
  const [colorName, setColorName] = useState("Dark Brown");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ originalUrl: string; recoloredUrl: string; appliedColor?: string } | null>(null);

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile) {
      setFile(selectedFile);
      setFilePreview(URL.createObjectURL(selectedFile));
    } else {
      setFile(null);
      setFilePreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select an image");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("color", color);

    try {
      const response = await fetch("/api/recolor-hair", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = "Failed to process image";
        try {
          const errData = await response.json();
          message = [errData?.error, errData?.details].filter(Boolean).join(" ") || message;
        } catch {
          
        }
        message = message.replace(/^Error:\s*/i, "");
        throw new Error(message);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: unknown) {
      let message = "Something went wrong";
      if (err instanceof Error) {
        message = err.message || message;
      } else if (typeof err === "string") {
        message = err;
      }

      message = message.replace(/^Error:\s*/i, "");
      setError(message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const PRESET_COLORS = [
    { name: "Blonde", val: "blonde", hex: "CAA36B" },
    { name: "Light Brown", val: "light brown", hex: "8A5F46" },
    { name: "Dark Brown", val: "dark brown", hex: "4A3022" },
    { name: "Auburn", val: "auburn", hex: "8D3127" },
    { name: "Ginger", val: "ginger", hex: "B55A2A" },
    { name: "Black", val: "black", hex: "2A211E" },
    { name: "Silver", val: "silver", hex: "AEB1B3" },
    { name: "Burgundy", val: "burgundy", hex: "4D1A1C" },
    { name: "Chestnut", val: "chestnut", hex: "7B4C37" },
  ];

  return (
    <main className="min-h-screen bg-[#0A0A0A] font-sans pt-28 pb-16 px-6 text-stone-300 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[450px] bg-[#C77DFF]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#E8B88A]/5 rounded-full blur-[100px] pointer-events-none animate-pulse-subtle" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8B88A]/10 border border-[#E8B88A]/10 mb-4"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E8B88A]" />
            <span className="text-[9px] tracking-[0.2em] uppercase font-bold text-[#E8B88A]">Virtual AI Salon</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-serif text-white mb-4 tracking-tight font-light"
          >
            Hair Color <span className="italic font-bold bg-gradient-to-r from-[#E8B88A] to-[#C77DFF] bg-clip-text text-transparent">Studio</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-stone-400 text-xs md:text-sm font-light max-w-md mx-auto"
          >
            Upload your picture and instantly experience high-fidelity professional color transformations.
          </motion.p>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-white/[0.01] border border-white/5 backdrop-blur-xl p-6 md:p-10 mb-12 rounded-3xl relative group shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)]"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#E8B88A] to-[#C77DFF] opacity-30 group-hover:opacity-100 transition-opacity duration-500 rounded-t-3xl"></div>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Upload Area */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-3.5 font-bold">
                Upload your photo
              </label>
              
              <div className="border border-white/5 border-dashed rounded-2xl p-6 text-center bg-white/[0.01] hover:bg-white/[0.03] hover:border-[#E8B88A]/30 transition-all cursor-pointer relative overflow-hidden min-h-[160px] flex flex-col items-center justify-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                
                {filePreview ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                      <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-white font-serif text-sm font-medium">
                      {file?.name}
                    </span>
                    <span className="text-stone-500 text-[10px] uppercase tracking-wider">
                      Click or drag to change photo
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center mb-3">
                      <Upload className="w-5 h-5 text-stone-400" />
                    </div>
                    <span className="text-white font-serif text-base block mb-1">
                      Select an Image
                    </span>
                    <span className="text-stone-500 text-[10px] uppercase tracking-widest">
                      Drag & drop or browse
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Presets Grid */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-stone-400 mb-4 font-bold">
                Select a Premium Shade
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3.5">
                {PRESET_COLORS.map((c) => {
                  const isSelected = color === c.val;
                  return (
                    <button
                      key={c.val}
                      type="button"
                      onClick={() => {
                        setColor(c.val);
                        setColorName(c.name);
                      }}
                      className={`flex flex-col items-center gap-2.5 p-3 rounded-xl border transition-all duration-300 ${
                        isSelected 
                          ? "border-[#E8B88A] bg-white/[0.03] shadow-lg" 
                          : "border-white/5 bg-transparent hover:border-white/10 hover:bg-white/[0.01]"
                      }`}
                    >
                      <div className="relative">
                        <div
                          className="w-10 h-10 rounded-full shadow-inner border border-white/10"
                          style={{ backgroundColor: `#${c.hex}` }}
                        />
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-[#E8B88A] to-[#D4A574] flex items-center justify-center border border-[#0A0A0A]">
                            <Check className="w-2.5 h-2.5 text-black stroke-[3px]" />
                          </div>
                        )}
                      </div>
                      <span className={`text-[9px] text-center uppercase tracking-wider font-semibold ${isSelected ? "text-[#E8B88A]" : "text-stone-500"}`}>
                        {c.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Shade Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] uppercase tracking-[0.2em] text-stone-400 font-bold">
                  Or input custom formula
                </label>
                <div className="flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-[#E8B88A]" />
                  <span className="text-[9px] text-[#E8B88A] font-bold uppercase tracking-wider">Tone control</span>
                </div>
              </div>
              <input
                type="text"
                value={color}
                onChange={(e) => {
                  setColor(e.target.value);
                  setColorName("Custom");
                }}
                placeholder="e.g., golden blonde, pastel pink, metallic silver"
                className="booking-input !py-3.5"
              />
              <p className="text-[10px] text-stone-500 mt-2 font-light">
                Our smart AI mapping automatically balances hues to ensure natural-looking textures and shine.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !file}
              className="w-full bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black px-8 py-4 tracking-[0.15em] uppercase text-xs font-bold rounded-xl disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(232,184,138,0.3)] hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  Generating Magic...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-black" />
                  Generate Magic
                </>
              )}
            </button>
          </form>

          {error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs tracking-wider uppercase rounded-xl text-center font-bold"
            >
              {error}
            </motion.div>
          )}
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
            >
              <div className="bg-white/[0.01] border border-white/5 p-6 rounded-3xl backdrop-blur-xl relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-white/5 rounded-t-3xl"></div>
                <h3 className="text-lg font-serif text-white mb-4 text-center">Original Frame</h3>
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/[0.01] border border-white/5 shadow-inner">
                  <img
                    src={result.originalUrl}
                    alt="Original"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              
              <div className="bg-white/[0.01] border border-white/5 p-6 rounded-3xl backdrop-blur-xl relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#E8B88A] to-[#C77DFF] rounded-t-3xl"></div>
                <h3 className="text-lg font-serif text-white mb-1.5 text-center">New Formula: {colorName}</h3>
                
                {result.appliedColor ? (
                  <p className="text-center text-[9px] tracking-widest uppercase text-[#E8B88A] mb-3.5 font-bold">
                    Applied Code: #{result.appliedColor}
                  </p>
                ) : (
                  <div className="h-7" />
                )}
                
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-white/[0.01] border border-white/5 shadow-inner">
                  <img
                    src={result.recoloredUrl}
                    alt="Recolored"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 right-4 bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                    Try on Success
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}