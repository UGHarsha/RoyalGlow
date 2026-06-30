"use client";
import { useState, useEffect, FormEvent, KeyboardEvent, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../utils/supabase";
import { API_BASE, jsonAuthHeaders } from "../../utils/api";
import { motion, AnimatePresence } from "framer-motion";
import { Suspense } from "react";

function BookPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "ai" ? "ai" : "manual";

  const [bookingView, setBookingView] = useState<"manual" | "ai">(initialMode);
  const [servicesData, setServicesData] = useState<{ id?: number; name: string; category: string; price: string; duration: number }[]>([]);

  // Manual booking states
  const [manualForm, setManualForm] = useState({
    name: "",
    category: "men - hair",
    service: "",
    date: "",
    time: "10:00 AM",
  });
  const [manualLoading, setManualLoading] = useState(false);
  const [manualSuccess, setManualSuccess] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingsData, setBookingsData] = useState<{ start: number; end: number }[]>([]);

  // AI Chat states
  const [input, setInput] = useState("");
  const [chatLog, setChatLog] = useState<{ role: string; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auth check on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  // Fetch services
  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await fetch("/api/services");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setServicesData(data);
        }
      } catch (err) {
        console.error("Error fetching services:", err);
      }
    }
    fetchServices();
  }, []);

  // Set initial service when data loads
  useEffect(() => {
    if (servicesData.length > 0 && !manualForm.service) {
      const initialCatSvc = servicesData.filter(
        (s) => s.category?.toLowerCase().trim() === manualForm.category?.toLowerCase().trim()
      )[0];
      if (initialCatSvc) {
        setManualForm((prev) => ({
          ...prev,
          service: `${initialCatSvc.name} ${initialCatSvc.duration} min (Rs. ${initialCatSvc.price})`,
        }));
      }
    }
  }, [servicesData, manualForm.category, manualForm.service]);

  // Fetch booked times
  useEffect(() => {
    async function fetchBookedTimes() {
      if (!manualForm.date) {
        setBookingsData([]);
        return;
      }
      try {
        const response = await fetch(`/api/booked-slots?date=${manualForm.date}`);
        if (!response.ok) throw new Error("Failed to fetch slots");
        const data = await response.json();
        if (data) {
          const bookingsList = data.map((b: { appointment_date: string; service?: string }) => {
            const date = new Date(b.appointment_date);
            const startMin = date.getHours() * 60 + date.getMinutes();
            const p = b.service ? b.service.match(/(\d+)\s*min/) : null;
            const dur = p ? parseInt(p[1]) : 60;
            return { start: startMin, end: startMin + dur };
          });
          setBookingsData(bookingsList);
        }
      } catch (err) {
        console.error("Error fetching booked times:", err);
      }
    }
    fetchBookedTimes();
  }, [manualForm.date, manualSuccess]);

  // Calculate available times
  const availableTimes: string[] = [];
  if (manualForm.date) {
    const d = new Date(manualForm.date);
    if (d.getDay() !== 0) {
      const durationMin = parseInt(manualForm.service.match(/(\d+)\s*min/)?.[1] || "60");
      const shopOpenMin = 9 * 60;
      const shopCloseMin = 20 * 60;
      for (let min = shopOpenMin; min + durationMin <= shopCloseMin; min += 30) {
        const newStart = min;
        const newEnd = min + durationMin;
        const isOverlapping = bookingsData.some(
          (b) => Math.max(newStart, b.start) < Math.min(newEnd, b.end)
        );
        if (!isOverlapping) {
          const hours = Math.floor(min / 60);
          const minutes = min % 60;
          const ampm = hours >= 12 ? "PM" : "AM";
          const h12 = hours % 12 || 12;
          const minStr = minutes.toString().padStart(2, "0");
          availableTimes.push(`${h12}:${minStr} ${ampm}`);
        }
      }
    }
  }

  const availableTimesJoined = availableTimes.join(",");
  useEffect(() => {
    if (availableTimes.length > 0 && !availableTimes.includes(manualForm.time)) {
      setManualForm((prev) => ({ ...prev, time: availableTimes[0] }));
    } else if (availableTimes.length === 0 && manualForm.time !== "") {
      setManualForm((prev) => ({ ...prev, time: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTimesJoined]);

  // Chat scroll
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatLog, loading]);

  // Manual submit
  const handleManualSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setManualLoading(true);
    setManualSuccess(false);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      alert("Please login first");
      setManualLoading(false);
      return;
    }

    const convertTimeToLocalTimeStr = (timeStr: string) => {
      if (!timeStr) return "12:00:00";
      const [time, modifier] = timeStr.split(" ");
      let hours = time.split(":")[0];
      const minutes = time.split(":")[1];
      if (hours === "12") hours = "00";
      if (modifier === "PM") hours = (parseInt(hours, 10) + 12).toString();
      return `${hours.padStart(2, "0")}:${minutes}:00`;
    };
    const dateTimeString = `${manualForm.date}T${convertTimeToLocalTimeStr(manualForm.time)}`;

    try {
      const appointmentDate = new Date(dateTimeString).toISOString();
      const response = await fetch(`${API_BASE}/api/book-manual`, {
        method: "POST",
        headers: jsonAuthHeaders(session.access_token),
        body: JSON.stringify({
          name: manualForm.name,
          service: manualForm.service,
          date: appointmentDate,
          userId: session.user.id,
          userEmail: session.user.email,
          accessToken: session.access_token,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to book appointment");
      }
      setManualSuccess(true);
      setManualForm({ ...manualForm, name: "" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Booking error:", errorMessage);
      alert(`Booking failed: ${errorMessage}`);
    } finally {
      setManualLoading(false);
    }
  };

  // AI Chat
  const sendMessage = async (textToSubmit?: string | React.MouseEvent) => {
    const text = typeof textToSubmit === "string" ? textToSubmit : input;
    if (!text.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      setChatLog((prev) => [...prev, { role: "bella", text: "Please login first to book an appointment." }]);
      return;
    }

    const userMsg = { role: "user", text: text };
    setChatLog([...chatLog, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        { role: "bella", text: "Sorry, I encountered an error. Please make sure your API key is configured." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Get selected service details for summary
  const selectedServiceName = manualForm.service.split(" Rs.")[0]?.split(/\s+\d+\s*min/)[0] || "";
  const selectedServicePrice = manualForm.service.match(/Rs\.\s*([\d,]+)/)?.[1] || "N/A";
  const selectedServiceDuration = manualForm.service.match(/(\d+)\s*min/)?.[1] || "N/A";

  // Format date nicely
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  const steps = [
    { step: 1, label: "Choose Treatment", icon: "✦" },
    { step: 2, label: "Pick Date & Time", icon: "📅" },
    { step: 3, label: "Confirm Booking", icon: "✓" },
  ];

  return (
    <main className="min-h-screen bg-[#0A0A0A] font-sans text-stone-300">
      {/* Page Header */}
      <section className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 z-0">
          <Image src="/salon-interior.png" alt="Royal Glow Salon" fill className="object-cover brightness-[0.2]" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-[#0A0A0A]" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 pt-32 pb-16">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/10 bg-white/[0.02] backdrop-blur-md mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8B88A] animate-pulse" />
            <span className="text-[9px] tracking-[0.3em] uppercase text-white/80 font-black">Book Your Visit</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-serif text-white mb-4"
          >
            Reserve Your <span className="italic font-bold bg-gradient-to-r from-[#E8B88A] to-[#C77DFF] bg-clip-text text-transparent">Transformation</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-stone-400 max-w-lg text-sm font-light leading-relaxed mb-8"
          >
            Choose your preferred booking method below — manual step-by-step scheduling or let our AI concierge Bella handle everything for you.
          </motion.p>
        </div>
      </section>

      {/* =================== BOOKING FLOW =================== */}
      <section className="max-w-6xl mx-auto px-6 md:px-12 py-12 md:py-16">
        {manualSuccess ? (
          /* ===== SUCCESS STATE ===== */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto text-center py-20"
          >
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-8 shadow-[0_0_60px_rgba(16,185,129,0.3)] animate-success-check">
              <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-3xl md:text-4xl font-sans font-bold text-white mb-4">
              Reservation <span className="gradient-text">Confirmed!</span>
            </h2>
            <p className="text-stone-300 text-sm max-w-md mx-auto mb-6 leading-relaxed font-sans font-bold">
              Your appointment has been booked successfully. We&apos;ve sent a confirmation to your email with all the details.
            </p>

            {/* Booking Summary Card */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 max-w-sm mx-auto mb-10 text-left">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <p className="text-[8px] uppercase tracking-[0.2em] text-green-400 font-sans font-bold">Confirmed</p>
                  <p className="text-white text-sm font-sans font-bold">{selectedServiceName}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-stone-500 font-bold text-[8px] uppercase tracking-wider">Date</p>
                  <p className="text-white mt-0.5 font-sans font-bold">{formatDate(manualForm.date)}</p>
                </div>
                <div>
                  <p className="text-stone-500 font-bold text-[8px] uppercase tracking-wider">Time</p>
                  <p className="text-white mt-0.5 font-sans font-bold">{manualForm.time}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/bookings"
                className="px-8 py-3.5 bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black rounded-full uppercase tracking-[0.2em] text-[10px] font-black hover:shadow-[0_0_30px_rgba(232,184,138,0.35)] hover:scale-105 transition-all duration-300"
              >
                View My Appointments
              </Link>
              <Link href="/"
                className="px-8 py-3.5 bg-white/5 border border-white/10 text-white rounded-full uppercase tracking-[0.2em] text-[10px] font-black hover:bg-white/10 transition-all duration-300"
              >
                Return Home
              </Link>
            </div>
          </motion.div>
        ) : (
          /* ===== BOOKING STEPS ===== */
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
            {/* Left: Stepper Progress */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:w-72 shrink-0"
            >
              <div className="lg:sticky lg:top-28 space-y-2">
                {steps.map((s, idx) => (
                  <button
                    key={s.step}
                    onClick={() => {
                      if (s.step < bookingStep || (s.step === 2 && manualForm.service) || (s.step === 3 && manualForm.service && manualForm.date && manualForm.time)) {
                        setBookingStep(s.step);
                      }
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 text-left group ${
                      bookingStep === s.step
                        ? "bg-white/[0.04] border border-[#E8B88A]/30 shadow-[0_0_20px_rgba(232,184,138,0.08)]"
                        : bookingStep > s.step
                        ? "bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] cursor-pointer"
                        : "bg-transparent border border-transparent opacity-40 cursor-default"
                    }`}
                  >
                    <span
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0 transition-all ${
                        bookingStep === s.step
                          ? "bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black shadow-lg"
                          : bookingStep > s.step
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                          : "bg-white/5 text-stone-600 border border-white/5"
                      }`}
                    >
                      {bookingStep > s.step ? "✓" : s.step}
                    </span>
                    <div>
                      <p className={`text-[9px] uppercase tracking-[0.2em] font-sans font-bold ${
                        bookingStep === s.step ? "text-[#E8B88A]" : bookingStep > s.step ? "text-emerald-400" : "text-stone-600"
                      }`}>
                        Step {s.step}
                      </p>
                      <p className={`text-sm font-sans font-bold ${
                        bookingStep === s.step ? "text-white" : bookingStep > s.step ? "text-stone-400" : "text-stone-600"
                      }`}>
                        {s.label}
                      </p>
                    </div>
                  </button>
                ))}

                {/* Info Cards */}
                <div className="mt-8 space-y-3 hidden lg:block">
                  <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#E8B88A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div>
                        <p className="text-[8px] uppercase tracking-[0.15em] text-stone-500 font-bold">Hours</p>
                        <p className="text-white text-xs font-sans">Mon–Sat: 9 AM – 8 PM</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#E8B88A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </div>
                      <div>
                        <p className="text-[8px] uppercase tracking-[0.15em] text-stone-500 font-bold">Location</p>
                        <p className="text-white text-xs font-sans">Beach Road, Matara</p>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-white/5 pt-3">
                    <p className="text-[8px] uppercase tracking-[0.12em] text-stone-500 font-bold">
                      Need Help? <span className="text-[#E8B88A] font-sans">+94 41 123 4567</span>
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right: Content Area */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {/* ===== STEP 1: Choose Treatment ===== */}
                {bookingStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="mb-8">
                      <h2 className="text-2xl md:text-3xl font-sans font-bold text-white mb-2">
                        Choose a <span className="gradient-text">Treatment</span>
                      </h2>
                      <p className="text-stone-400 text-sm font-sans font-bold">
                        Select your category and pick the treatment you&apos;d like.
                      </p>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-2 mb-8">
                      {[
                        { id: "men - face", label: "Men's Face" },
                        { id: "men - hair", label: "Men's Hair" },
                        { id: "women - face", label: "Women's Face" },
                        { id: "women - hair", label: "Women's Hair" },
                        { id: "women - nails", label: "Women's Nails" },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setManualForm((prev) => ({ ...prev, category: cat.id, service: "" }));
                          }}
                          className={`px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider font-sans font-extrabold transition-all duration-300 border ${
                            manualForm.category === cat.id
                              ? "bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black border-transparent shadow-lg"
                              : "bg-white/[0.03] text-stone-300 hover:bg-white/[0.06] border border-white/10"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>

                    {/* Treatment Grid */}
                    <div className="grid sm:grid-cols-2 gap-3 mb-10">
                      {servicesData
                        .filter((s) => s.category?.toLowerCase().trim() === manualForm.category?.toLowerCase().trim())
                        .map((s) => {
                          const svcStr = `${s.name} ${s.duration} min (Rs. ${s.price})`;
                          const isSelected = manualForm.service === svcStr;
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setManualForm((prev) => ({ ...prev, service: svcStr }));
                              }}
                              className={`w-full p-5 rounded-2xl text-left border transition-all duration-300 group ${
                                isSelected
                                  ? "bg-white/[0.05] border-[#E8B88A] shadow-[0_0_25px_rgba(232,184,138,0.15)]"
                                  : "bg-white/[0.01] border-white/10 hover:border-white/20 hover:bg-white/[0.03]"
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-base text-white font-sans font-extrabold mb-1">{s.name}</p>
                                  <p className="text-[11px] text-[#E8B88A] uppercase tracking-wider font-sans font-bold">
                                    {s.duration} Min
                                  </p>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                  <p className="text-base font-sans font-extrabold text-[#E8B88A]">Rs. {s.price}</p>
                                  {isSelected && (
                                    <span className="inline-block w-3 h-3 rounded-full bg-gradient-to-r from-[#E8B88A] to-[#D4A574] mt-2 shadow-[0_0_8px_rgba(232,184,138,0.4)]" />
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      {servicesData.filter(
                        (s) => s.category?.toLowerCase().trim() === manualForm.category?.toLowerCase().trim()
                      ).length === 0 && (
                        <p className="text-center text-sm font-sans font-bold text-stone-500 py-12 col-span-2">
                          No treatments loaded in this category.
                        </p>
                      )}
                    </div>

                    {/* Next Button */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={!manualForm.service}
                        onClick={() => setBookingStep(2)}
                        className="px-8 py-4 bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black hover:shadow-[0_0_30px_rgba(232,184,138,0.3)] disabled:opacity-40 disabled:shadow-none text-[11px] font-sans font-extrabold uppercase tracking-[0.2em] rounded-full transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
                      >
                        Continue to Date & Time
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ===== STEP 2: Pick Date & Time ===== */}
                {bookingStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="mb-8">
                      <h2 className="text-2xl md:text-3xl font-sans font-bold text-white mb-2">
                        Pick <span className="gradient-text">Date & Time</span>
                      </h2>
                      <p className="text-stone-400 text-sm font-sans font-bold">
                        Choose the best time that fits your schedule. We&apos;re open Mon–Sat, 9 AM – 8 PM.
                      </p>
                    </div>

                    {/* Selected Treatment Summary */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 mb-8 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#E8B88A]/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-[#E8B88A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <div>
                          <p className="text-[8px] uppercase tracking-[0.15em] text-stone-500 font-bold">Selected Treatment</p>
                          <p className="text-white text-base font-sans font-extrabold">{selectedServiceName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[#E8B88A] font-sans font-bold">Rs. {selectedServicePrice}</p>
                        <p className="text-[10px] text-stone-500 uppercase tracking-wider font-bold">{selectedServiceDuration} Min</p>
                      </div>
                    </div>

                    {/* Date Picker */}
                    <div className="mb-8">
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-stone-400 font-sans font-bold mb-3">
                        Select Date
                      </label>
                      <input
                        type="date"
                        min={new Date().toLocaleDateString("en-CA")}
                        required
                        value={manualForm.date}
                        onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                        className="booking-input font-sans font-bold text-white max-w-sm"
                      />
                      {manualForm.date && (
                        <p className="text-xs text-stone-400 mt-2 font-sans font-bold">{formatDate(manualForm.date)}</p>
                      )}
                    </div>

                    {/* Time Slots */}
                    <div className="mb-10">
                      <label className="block text-[10px] uppercase tracking-[0.2em] text-stone-400 font-sans font-bold mb-3">
                        Available Time Slots
                      </label>
                      {!manualForm.date ? (
                        <div className="bg-white/[0.01] rounded-2xl border border-white/5 p-8 text-center">
                          <svg className="w-8 h-8 text-stone-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          <p className="text-stone-500 text-sm font-sans font-bold">Please select a date first to see available slots.</p>
                        </div>
                      ) : availableTimes.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
                          {availableTimes.map((time) => {
                            const isSelected = manualForm.time === time;
                            return (
                              <button
                                key={time}
                                type="button"
                                onClick={() => setManualForm((prev) => ({ ...prev, time }))}
                                className={`py-3.5 px-3 rounded-xl text-[11px] font-sans font-extrabold tracking-wider text-center border transition-all duration-300 ${
                                  isSelected
                                    ? "bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black border-transparent shadow-[0_0_20px_rgba(232,184,138,0.25)]"
                                    : "bg-white/[0.01] border-white/10 text-stone-300 hover:border-[#E8B88A]/30 hover:bg-white/[0.03]"
                                }`}
                              >
                                {time}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="bg-white/[0.01] rounded-2xl border border-[#E8B88A]/20 p-8 text-center">
                          <p className="text-[#E8B88A] text-sm font-sans font-bold">
                            No slots available — shop is closed on Sundays, or all slots are booked.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between">
                      <button
                        type="button"
                        onClick={() => setBookingStep(1)}
                        className="px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-full transition-all flex items-center gap-2"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
                        Back
                      </button>
                      <button
                        type="button"
                        disabled={!manualForm.time || !manualForm.date}
                        onClick={() => setBookingStep(3)}
                        className="px-8 py-4 bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black hover:shadow-[0_0_30px_rgba(232,184,138,0.3)] disabled:opacity-40 disabled:shadow-none text-[11px] font-sans font-extrabold uppercase tracking-[0.2em] rounded-full transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
                      >
                        Review & Confirm
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ===== STEP 3: Review & Confirm ===== */}
                {bookingStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="mb-8">
                      <h2 className="text-2xl md:text-3xl font-sans font-bold text-white mb-2">
                        Review & <span className="gradient-text">Confirm</span>
                      </h2>
                      <p className="text-stone-400 text-sm font-sans font-bold">
                        Please verify your booking details below and enter your name to confirm.
                      </p>
                    </div>

                    {/* Full Booking Summary */}
                    <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 md:p-8 mb-8 space-y-6">
                      <div className="flex items-center gap-3 pb-5 border-b border-white/5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E8B88A]/20 to-[#D4A574]/10 flex items-center justify-center">
                          <svg className="w-6 h-6 text-[#E8B88A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </div>
                        <div>
                          <p className="text-[8px] uppercase tracking-[0.2em] text-stone-500 font-bold">Booking Summary</p>
                          <p className="text-white font-sans font-bold text-lg">Your Appointment Details</p>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">Treatment</p>
                          <p className="text-white text-base font-sans font-extrabold">{selectedServiceName}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">Price</p>
                          <p className="text-[#E8B88A] text-xl font-sans font-extrabold">Rs. {selectedServicePrice}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">Date</p>
                          <p className="text-white text-sm font-sans font-bold">{formatDate(manualForm.date)}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">Time Slot</p>
                          <p className="text-white text-sm font-sans font-bold">{manualForm.time}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">Duration</p>
                          <p className="text-white text-sm font-sans font-bold">{selectedServiceDuration} Minutes</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] text-stone-500 font-bold uppercase tracking-wider">Location</p>
                          <p className="text-white text-sm font-sans font-bold">Beach Road, Matara</p>
                        </div>
                      </div>
                    </div>

                    {/* Name Input + Submit */}
                    <form onSubmit={handleManualSubmit}>
                      <div className="mb-8">
                        <label className="block text-[10px] uppercase tracking-[0.2em] text-stone-400 font-sans font-bold mb-3 flex items-center gap-2">
                          <svg className="w-3 h-3 text-[#E8B88A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          Your Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={manualForm.name}
                          onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                          className="booking-input font-sans font-bold text-white max-w-md"
                          placeholder="Enter your full name"
                        />
                      </div>

                      {/* Navigation */}
                      <div className="flex flex-col sm:flex-row justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => setBookingStep(2)}
                          className="px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-[0.15em] rounded-full transition-all flex items-center gap-2"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" /></svg>
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={manualLoading || !manualForm.name}
                          className="flex-1 sm:flex-initial sm:min-w-[280px] bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black py-4 px-10 rounded-full uppercase tracking-[0.25em] text-[11px] font-sans font-extrabold transition-all duration-300 hover:shadow-[0_0_40px_rgba(232,184,138,0.35)] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2.5 disabled:opacity-50"
                        >
                          {manualLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              Confirm Reservation
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#E8B88A]/30 border-t-[#E8B88A] rounded-full animate-spin" /></div>}>
      <BookPageContent />
    </Suspense>
  );
}
