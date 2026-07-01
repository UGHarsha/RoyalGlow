"use client";
import { useState, useEffect, FormEvent, KeyboardEvent, Suspense, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../utils/supabase";
import { API_BASE, jsonAuthHeaders } from "../utils/api";
import Reviews from "./components/Reviews";
import { motion, AnimatePresence } from "framer-motion";

const aboutFeatures = [
  {
    icon: (<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>),
    title: "Intelligent Concierge",
    description: "Experience effortless scheduling with Bella, our AI concierge designed to curate your perfect visit and style narrative.",
  },
  {
    icon: (<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    title: "Styling Previews",
    description: "Visualize your transformation with our AR-powered virtual try-on, allowing you to explore new hues and cuts with confidence.",
  },
  {
    icon: (<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    title: "Bespoke Scheduling",
    description: "Sophisticated real-time availability tailored to your rhythm. Secure your moment with precision and ease.",
  },
  {
    icon: (<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>),
    title: "Curated Apothecary",
    description: "We utilize an exclusive selection of global professional products, ensuring every treatment is an infusion of health and shine.",
  },
  {
    icon: (<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>),
    title: "Artisanal Crafters",
    description: "Our professionals are masters of both trend and tradition, dedicated to the meticulous craft of personalized beauty.",
  },
  {
    icon: (<svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>),
    title: "Signature Occasions",
    description: "From bridal elegance to gala-ready transformations, we specialize in making your significant moments unforgettable.",
  },
];

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bookingView, setBookingView] = useState<"none" | "ai" | "manual">("none");
  const [currentHeroSlide, setCurrentHeroSlide] = useState(0);
  const heroImages = ["/1.jpg", "/2.jpg", "/3.jpg"];

  // Dynamic Content States
  const [servicesData, setServicesData] = useState<{ id?: number, name: string, category: string, price: string, duration: number }[]>([]);
  const [lookbookData, setLookbookData] = useState<{ id?: number, src: string, alt?: string }[]>([]);

  useEffect(() => {
    async function fetchDynamicData() {
      try {
        const [servRes, lookRes] = await Promise.all([
          fetch("/api/services"),
          fetch("/api/lookbook")
        ]);
        if (servRes.ok) {
          const sData = await servRes.json();
          if (Array.isArray(sData)) setServicesData(sData);
        }
        if (lookRes.ok) {
          const lData = await lookRes.json();
          if (Array.isArray(lData)) setLookbookData(lData);
        }
      } catch (err) {
        console.error("Error fetching dynamic data:", err);
      }
    }
    fetchDynamicData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentHeroSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroImages.length]);

  // Manual booking states
  const [manualForm, setManualForm] = useState({
    name: "",
    category: "men - hair",
    service: "",
    date: "",
    time: "10:00 AM",
  });

  useEffect(() => {
    if (servicesData.length > 0 && !manualForm.service) { // set initial service when loaded
      const initialCatSvc = servicesData.filter(s => s.category?.toLowerCase().trim() === manualForm.category?.toLowerCase().trim())[0];
      if (initialCatSvc) {
        setManualForm(prev => ({ ...prev, service: `${initialCatSvc.name} ${initialCatSvc.duration} min (Rs. ${initialCatSvc.price})` }));
      }
    }
  }, [servicesData, manualForm.category, manualForm.service]);

  const [manualLoading, setManualLoading] = useState(false);
  const [manualSuccess, setManualSuccess] = useState(false);
  const [bookingStep, setBookingStep] = useState(1);

  const [bookingsData, setBookingsData] = useState<{ start: number, end: number }[]>([]);

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
          const bookingsList = data.map((b: { appointment_date: string, service?: string }) => {
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

  interface TimeSlot {
    time: string;
    isBooked: boolean;
  }

  const timeSlots: TimeSlot[] = [];
  const availableTimes: string[] = [];

  if (manualForm.date) {
    const d = new Date(manualForm.date);
    if (d.getDay() !== 0) { // Not Sunday
      const durationMin = parseInt(manualForm.service.match(/(\d+)\s*min/)?.[1] || "60");
      const shopOpenMin = 9 * 60; // 9:00 AM
      const shopCloseMin = 20 * 60; // 8:00 PM

      for (let min = shopOpenMin; min + durationMin <= shopCloseMin; min += 30) {
        const newStart = min;
        const newEnd = min + durationMin;
        const isOverlapping = bookingsData.some(b => Math.max(newStart, b.start) < Math.min(newEnd, b.end));

        const hours = Math.floor(min / 60);
        const minutes = min % 60;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const h12 = hours % 12 || 12;
        const minStr = minutes.toString().padStart(2, '0');
        const slotTime = `${h12}:${minStr} ${ampm}`;

        timeSlots.push({
          time: slotTime,
          isBooked: isOverlapping,
        });

        if (!isOverlapping) {
          availableTimes.push(slotTime);
        }
      }
    }
  }

  const availableTimesJoined = availableTimes.join(',');
  useEffect(() => {
    if (availableTimes.length > 0 && !availableTimes.includes(manualForm.time)) {
      setManualForm(prev => ({ ...prev, time: availableTimes[0] }));
    } else if (availableTimes.length === 0 && manualForm.time !== "") {
      setManualForm(prev => ({ ...prev, time: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTimesJoined]);

  const [input, setInput] = useState("");
  const [chatLog, setChatLog] = useState<{ role: string; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatLog, loading]);
  useEffect(() => {
    const bookParam = searchParams.get("book");
    if (bookParam === "true" || bookParam === "manual" || bookParam === "ai") {
      const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (bookParam === "ai") {
            const triggerAI = () => {
              if ((window as any).openBellaAI) {
                (window as any).openBellaAI();
              } else {
                setTimeout(triggerAI, 100);
              }
            };
            triggerAI();
          } else {
            setBookingView("manual");
          }
        } else {
          router.push("/login");
        }
      };
      checkAuth();
    }
  }, [searchParams, router]);

  const handleBookingAction = async (view: "ai" | "manual") => {
    if (view === "ai") {
      if ((window as any).openBellaAI) {
        (window as any).openBellaAI();
      }
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    setBookingView("manual");
    setBookingStep(1);
    setManualSuccess(false); // Reset success state when opening the form
  };

  const handleManualSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setManualLoading(true);
    setManualSuccess(false);

    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      alert("Please login first");
      setManualLoading(false);
      return;
    }

    // Combine date and time
    const convertTimeToLocalTimeStr = (timeStr: string) => {
      if (!timeStr) return "12:00:00";
      const [time, modifier] = timeStr.split(' ');
      let hours = time.split(':')[0];
      const minutes = time.split(':')[1];
      if (hours === '12') hours = '00';
      if (modifier === 'PM') hours = (parseInt(hours, 10) + 12).toString();
      return `${hours.padStart(2, '0')}:${minutes}:00`;
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
      setManualForm({ ...manualForm, name: "" }); // Reset some fields
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Booking error:", errorMessage);
      alert(`Booking failed: ${errorMessage}`);
    } finally {
      setManualLoading(false);
    }
  };

  const sendMessage = async (textToSubmit?: string | React.MouseEvent) => {
    const text = typeof textToSubmit === 'string' ? textToSubmit : input;
    if (!text.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      setChatLog((prev) => [...prev, { role: "bella", text: "Please login first to book an appointment." }]);
      return;
    }

    const userMsg = { role: "user", text: text };
    setChatLog([...chatLog, userMsg]);
    if (typeof textToSubmit !== 'string') setInput("");
    else setInput(""); // Clear input either way
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
      setChatLog((prev) => [...prev, {
        role: "bella",
        text: "Sorry, I encountered an error. Please make sure your API key is configured."
      }]);
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

  // Close booking modal on Escape for convenience
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setBookingView("none");
        if (searchParams.get("book") === "true") router.replace("/");
      }
    };
    if (bookingView !== "none") window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bookingView, searchParams, router]);

  return (
    <main className="min-h-screen bg-[#0A0A0A] font-sans text-stone-300 overflow-hidden relative z-0">

      {bookingView !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-modal-backdrop"
          style={{ background: 'rgba(5, 5, 5, 0.95)', backdropFilter: 'blur(30px)' }}
        >
          <div className="w-full h-full overflow-hidden flex flex-col md:flex-row bg-[#0D0D0D]">

            {/* Left: Cinematic Image Panel */}
            <div className="hidden md:flex w-[45%] relative overflow-hidden">
              <Image src="/salon-interior.png" alt="Royal Glow Salon" fill className="object-cover" />
              {/* Gradient overlays */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent z-[1]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent z-[1]" />
              {/* Decorative blob */}
              <div className="absolute top-20 -left-10 w-40 h-40 bg-[#E8B88A]/10 rounded-full blur-[80px] z-[2] animate-blob" />

              {/* Content overlay */}
              <div className="absolute inset-0 z-[3] flex flex-col justify-between p-12">
                <div>
                  <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 mb-8">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E8B88A] animate-pulse" />
                    <span className="text-[9px] tracking-[0.25em] uppercase text-white/90 font-black">Now Booking</span>
                  </div>
                  <h2 className="text-4xl font-serif text-white leading-tight mb-4">
                    Reserve Your<br /><span className="gradient-text italic font-bold">Transformation</span>
                  </h2>
                  <p className="text-stone-400 text-xs font-light leading-relaxed max-w-[280px]">
                    Choose AI-powered scheduling or book manually — your luxury experience starts here.
                  </p>
                </div>

                {/* Info badges */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 backdrop-blur-md border border-white/5 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-[#E8B88A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <p className="text-[8px] uppercase tracking-[0.2em] text-stone-500 font-bold">Duration</p>
                      <p className="text-white text-xs">30 – 180 Minutes</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 backdrop-blur-md border border-white/5 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-[#E8B88A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div>
                      <p className="text-[8px] uppercase tracking-[0.2em] text-stone-500 font-bold">Location</p>
                      <p className="text-white text-xs">Beach Road, Matara</p>
                    </div>
                  </div>
                  <div className="pt-5 border-t border-white/5">
                    <p className="text-[8px] uppercase tracking-[0.15em] text-stone-500 font-bold">Need Help? <span className="text-[#E8B88A]">+94 41 123 4567</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Form/Chat Panel */}
            <div className="flex-1 flex flex-col bg-[#0D0D0D] relative overflow-hidden">
              {/* Close Button */}
              <button
                onClick={() => {
                  setBookingView("none");
                  if (searchParams.get("book") === "true" || searchParams.get("book") === "ai") router.replace("/");
                }}
                className="absolute top-5 right-5 z-30 w-9 h-9 rounded-full bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-stone-400 hover:text-white hover:border-[#E8B88A] hover:shadow-lg transition-all duration-300 animate-fadeIn"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              {/* Header Title */}
              <div className="px-6 md:px-10 pt-10 pb-2">
                <h3 className="text-2xl font-sans font-extrabold text-white uppercase tracking-wider">Book Appointment</h3>
                <p className="text-xs text-stone-500 mt-1">Experience Matara&apos;s premium styling sanctuary.</p>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 md:p-10 animate-fadeIn">
                  {manualSuccess ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-16 animate-scale-in">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(16,185,129,0.3)] animate-success-check">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <h3 className="text-2xl font-sans font-bold text-white mb-3">Reservation <span className="gradient-text">Confirmed</span></h3>
                      <p className="text-stone-300 text-sm max-w-sm mb-10 leading-relaxed font-sans font-bold">
                        Your appointment has been booked. We&apos;ve sent a confirmation to your email.
                      </p>
                      <button onClick={() => { setBookingView("none"); if (searchParams.get("book") === "true") router.replace("/"); }}
                        className="bg-white text-black px-8 py-3.5 rounded-full uppercase tracking-[0.2em] text-[10px] font-black hover:bg-[#E8B88A] hover:shadow-xl hover:scale-105 transition-all duration-300"
                      >Return Home</button>
                    </div>
                  ) : (
                    <div className="max-w-xl mx-auto space-y-6">
                      {/* Stepper Header */}
                      <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6">
                        {[
                          { step: 1, label: "Treatment" },
                          { step: 2, label: "Date & Time" },
                          { step: 3, label: "Confirm" }
                        ].map((s) => (
                          <div key={s.step} className="flex items-center gap-2">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border ${bookingStep === s.step
                                ? "bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black border-transparent"
                                : bookingStep > s.step
                                  ? "bg-emerald-500 text-white border-transparent"
                                  : "bg-white/5 text-stone-500 border-white/10"
                              }`}>
                              {bookingStep > s.step ? "✓" : s.step}
                            </span>
                            <span className={`text-[10px] uppercase tracking-wider font-sans font-bold ${bookingStep === s.step ? "text-[#E8B88A]" : "text-stone-500"
                              }`}>
                              {s.label}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* STEP 1: Select Category & Treatment */}
                      {bookingStep === 1 && (
                        <div className="space-y-4 animate-slide-in-right">
                          <div>
                            <h3 className="text-xl font-sans font-bold text-white mb-1">Choose a <span className="gradient-text">Treatment</span></h3>
                            <p className="text-stone-400 text-xs font-sans font-bold">Select your styling preferences from our categories.</p>
                          </div>

                          {/* Category selector capsules */}
                          <div className="flex flex-wrap gap-2 py-2">
                            {[
                              { id: "men - face", label: "Men's Face" },
                              { id: "men - hair", label: "Men's Hair" },
                              { id: "women - face", label: "Women's Face" },
                              { id: "women - hair", label: "Women's Hair" },
                              { id: "women - nails", label: "Women's Nails" }
                            ].map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  setManualForm(prev => ({ ...prev, category: cat.id, service: "" }));
                                }}
                                className={`px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider font-sans font-extrabold transition-all border ${manualForm.category === cat.id
                                    ? "bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black border-transparent shadow-lg"
                                    : "bg-white/5 text-stone-200 border-white/10 hover:bg-white/10"
                                  }`}
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>

                          {/* Treatment List (Interactive Grid) */}
                          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                            {servicesData.filter(s => s.category?.toLowerCase().trim() === manualForm.category?.toLowerCase().trim()).map(s => {
                              const svcStr = `${s.name} ${s.duration} min (Rs. ${s.price})`;
                              const isSelected = manualForm.service === svcStr;
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => {
                                    setManualForm(prev => ({ ...prev, service: svcStr }));
                                  }}
                                  className={`w-full p-4 rounded-xl text-left border transition-all flex justify-between items-center ${isSelected
                                      ? "bg-white/[0.06] border-[#E8B88A] shadow-[0_0_20px_rgba(232,184,138,0.15)]"
                                      : "bg-white/[0.02] border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
                                    }`}
                                >
                                  <div>
                                    <p className="text-base text-white font-sans font-extrabold">{s.name}</p>
                                    <p className="text-[11px] text-[#E8B88A] mt-1.5 uppercase tracking-wider font-sans font-bold">{s.duration} Min</p>
                                  </div>
                                  <div className="text-right flex flex-col items-end justify-center">
                                    <p className="text-base font-sans font-extrabold text-[#E8B88A]">Rs. {s.price}</p>
                                    {isSelected && (
                                      <span className="inline-block w-3 h-3 rounded-full bg-gradient-to-r from-[#E8B88A] to-[#D4A574] mt-2 shadow-[0_0_8px_rgba(232,184,138,0.4)]" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                            {servicesData.filter(s => s.category?.toLowerCase().trim() === manualForm.category?.toLowerCase().trim()).length === 0 && (
                              <p className="text-center text-sm font-sans font-bold text-stone-500 py-8">No treatments loaded in this category.</p>
                            )}
                          </div>

                          {/* Action navigation */}
                          <div className="pt-4 flex justify-end">
                            <button
                              type="button"
                              disabled={!manualForm.service}
                              onClick={() => setBookingStep(2)}
                              className="px-8 py-4 bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black hover:shadow-[0_0_30px_rgba(232,184,138,0.35)] disabled:opacity-40 disabled:hover:bg-white text-[11px] font-sans font-extrabold uppercase tracking-widest rounded-full transition-all duration-300"
                            >
                              Next Step →
                            </button>
                          </div>
                        </div>
                      )}

                      {bookingStep === 2 && (
                        <div className="space-y-5 animate-slide-in-right">
                          <div>
                            <h3 className="text-xl font-sans font-bold text-white mb-1">Pick <span className="gradient-text">Date & Time</span></h3>
                            <p className="text-stone-400 text-xs font-sans font-bold">Choose the best slot that matches your routine.</p>
                          </div>

                          {/* Inline Date input wrapper */}
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-sans font-bold">Select Date</label>
                            <input
                              type="date"
                              min={new Date().toLocaleDateString('en-CA')}
                              required
                              value={manualForm.date}
                              onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                              className="booking-input font-sans font-bold text-white"
                            />
                          </div>

                          {/* Grid slots for Times */}
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-sans font-bold">Select Available Time</label>
                            {!manualForm.date ? (
                              <p className="text-sm font-sans font-bold text-stone-500 py-4 bg-white/[0.01] rounded-xl border border-white/5 text-center">Please select a date first.</p>
                            ) : timeSlots.length > 0 ? (
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                                {timeSlots.map((slot) => {
                                  const isSelected = manualForm.time === slot.time;
                                  if (slot.isBooked) {
                                    return (
                                      <div
                                        key={slot.time}
                                        className="py-3 px-2 rounded-xl text-[11px] font-sans font-bold tracking-wider text-center border bg-white/[0.02] border-white/5 text-stone-600 cursor-not-allowed select-none relative overflow-hidden flex flex-col justify-center items-center gap-0.5"
                                      >
                                        <span>{slot.time}</span>
                                        <span className="text-[8px] uppercase tracking-wide text-red-500/80 font-black">Booked</span>
                                      </div>
                                    );
                                  }
                                  return (
                                    <button
                                      key={slot.time}
                                      type="button"
                                      onClick={() => setManualForm(prev => ({ ...prev, time: slot.time }))}
                                      className={`py-3.5 px-2 rounded-xl text-[11px] font-sans font-extrabold tracking-wider text-center border transition-all ${isSelected
                                          ? "bg-[#E8B88A] text-black border-transparent shadow-[0_0_15px_rgba(232,184,138,0.25)]"
                                          : "bg-white/[0.02] border-white/10 text-stone-200 hover:border-white/30 hover:bg-white/[0.04]"
                                        }`}
                                    >
                                      {slot.time}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm font-sans font-bold text-[#E8B88A] py-4 bg-white/[0.01] rounded-xl border border-white/5 text-center">No slots available or shop is closed on Sunday.</p>
                            )}
                          </div>

                          {/* Action navigation */}
                          <div className="pt-4 flex justify-between">
                            <button
                              type="button"
                              onClick={() => setBookingStep(1)}
                              className="px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white text-[11px] font-sans font-bold uppercase tracking-widest rounded-full transition-all"
                            >
                              ← Back
                            </button>
                            <button
                              type="button"
                              disabled={!manualForm.time || !manualForm.date}
                              onClick={() => setBookingStep(3)}
                              className="px-8 py-4 bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black hover:shadow-[0_0_30px_rgba(232,184,138,0.35)] disabled:opacity-40 disabled:hover:bg-white text-[11px] font-sans font-extrabold uppercase tracking-widest rounded-full transition-all duration-300"
                            >
                              Next Step →
                            </button>
                          </div>
                        </div>
                      )}

                      {/* STEP 3: Details & Confirmation */}
                      {bookingStep === 3 && (
                        <form onSubmit={handleManualSubmit} className="space-y-5 animate-slide-in-right">
                          <div>
                            <h3 className="text-xl font-sans font-bold text-white mb-1">Review & <span className="gradient-text">Confirm</span></h3>
                            <p className="text-stone-400 text-xs font-sans font-bold">Verify your booking specifications below.</p>
                          </div>
                          {/* Summary Card */}
                          <div className="bg-white/[0.02] border border-white/5 p-5 rounded-2xl space-y-4">
                            <div className="flex justify-between items-start border-b border-white/5 pb-3">
                              <div>
                                <p className="text-xs text-stone-500 font-sans font-bold uppercase tracking-wider">Service Selected</p>
                                <p className="text-base text-white font-sans font-extrabold mt-1">{manualForm.service.split(' Rs.')[0].split(' min')[0]}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-stone-500 font-sans font-bold uppercase tracking-wider">Estimated Price</p>
                                <p className="text-base text-[#E8B88A] font-sans font-extrabold mt-1">
                                  Rs. {manualForm.service.match(/Rs\.\s*([\d,]+)/)?.[1] || "N/A"}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-stone-500 font-sans font-bold uppercase tracking-wider">Appt Date</p>
                                <p className="text-sm text-white font-sans font-bold mt-1">{manualForm.date}</p>
                              </div>
                              <div>
                                <p className="text-xs text-stone-500 font-sans font-bold uppercase tracking-wider">Time Slot</p>
                                <p className="text-sm text-white font-sans font-bold mt-1">{manualForm.time}</p>
                              </div>
                            </div>
                          </div>

                          {/* Contact input fields */}
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-sans font-bold flex items-center gap-2">
                              <svg className="w-3 h-3 text-[#E8B88A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              Full Name
                            </label>
                            <input
                              type="text"
                              required
                              value={manualForm.name}
                              onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                              className="booking-input font-sans font-bold text-white"
                              placeholder="Enter your full name"
                            />
                          </div>

                          {/* Action navigation */}
                          <div className="pt-4 flex justify-between gap-4">
                            <button
                              type="button"
                              onClick={() => setBookingStep(2)}
                              className="px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white text-[11px] font-sans font-bold uppercase tracking-widest rounded-full transition-all"
                            >
                              ← Back
                            </button>
                            <button
                              type="submit"
                              disabled={manualLoading || !manualForm.name}
                              className="flex-1 bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black py-4 rounded-xl uppercase tracking-[0.25em] text-[11px] font-sans font-extrabold transition-all hover:shadow-[0_0_30px_rgba(232,184,138,0.35)] hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2"
                            >
                              {manualLoading ? (
                                <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Processing...</>
                              ) : (
                                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Confirm Reservation</>
                              )}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Hero Section - Cinematic Overlay on Mobile, Split on Desktop */}
      <section className="relative text-white min-h-screen flex md:flex-row items-stretch overflow-hidden">

        {/* Image Carousel - fullscreen background on mobile, right half on desktop */}
        <div className="absolute inset-0 md:relative md:w-[50%] md:order-2 z-0 md:z-10 md:min-h-screen overflow-hidden">
          <AnimatePresence>
            {heroImages.map((src, idx) => (
              idx === currentHeroSlide && (
                <motion.div
                  key={src}
                  initial={{ opacity: 0, scale: 1.08 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.8, ease: "easeInOut" }}
                  className="absolute inset-0"
                >
                  <Image src={src} alt={`Luxury Salon ${idx + 1}`} fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                </motion.div>
              )
            ))}
          </AnimatePresence>

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent z-10" />
          {/* Mobile-only dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/60 md:hidden z-[11]" />

          {/* Slide Indicators */}
          <div className="absolute right-4 md:right-6 bottom-6 md:bottom-auto md:top-1/2 md:-translate-y-1/2 z-30 flex flex-row md:flex-col gap-2 md:gap-3">
            {heroImages.map((_, idx) => (
              <button key={idx} onClick={() => setCurrentHeroSlide(idx)} className={`rounded-full transition-all duration-500 ${idx === currentHeroSlide ? 'w-6 h-1 md:w-1 md:h-8 bg-[#E8B88A]' : 'w-2 h-1 md:w-1 md:h-3 bg-white/20 hover:bg-white/40'}`} />
            ))}
          </div>
        </div>

        {/* Content Panel - overlaid on image on mobile, left half on desktop */}
        <div className="w-full md:w-[50%] md:order-1 md:bg-black flex flex-col justify-center px-6 sm:px-12 lg:px-20 pt-28 pb-16 md:py-28 relative z-10 md:z-20 min-h-screen md:min-h-0">
          <div className="absolute top-1/4 left-10 w-72 h-72 bg-[#E8B88A]/5 rounded-full blur-[100px] pointer-events-none" />

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}
            className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-white/5 bg-white/[0.02] backdrop-blur-md mb-8 self-start"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8B88A] animate-pulse" />
            <span className="text-[9px] tracking-[0.35em] uppercase font-black text-stone-400">Matara&apos;s Premium Sanctuary</span>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="text-3xl sm:text-5xl lg:text-7xl font-serif mb-4 sm:mb-6 leading-[1.05] tracking-tight font-light"
          >
            Refining <br />
            <span className="italic font-bold bg-gradient-to-r from-[#E8B88A] to-[#C77DFF] bg-clip-text text-transparent">Elegance</span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }}
            className="text-stone-300 md:text-stone-400 max-w-md mb-6 sm:mb-10 text-xs sm:text-sm font-light leading-relaxed"
          >
            A cinematic escape of sophisticated design. Timeless artistry meets modern innovation to redefine your unique essence.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center mb-8 sm:mb-16"
          >
            <button onClick={() => handleBookingAction("manual")}
              className="px-6 sm:px-8 py-3.5 sm:py-4 bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black tracking-[0.2em] uppercase text-[10px] font-black rounded-full hover:shadow-[0_0_30px_rgba(232,184,138,0.4)] transition-all duration-500 hover:scale-105 active:scale-95 text-center"
            >
              Reserve Your Visit
            </button>
            <button onClick={() => handleBookingAction("ai")}
              className="group px-6 sm:px-8 py-3.5 sm:py-4 tracking-[0.2em] uppercase text-[10px] font-black rounded-full border border-white/10 backdrop-blur-md bg-white/[0.02] hover:bg-white/5 transition-all duration-500 flex items-center justify-center gap-2"
            >
              <span className="text-white">Consult Bella AI</span>
              <svg className="w-3.5 h-3.5 text-[#E8B88A] group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </button>
          </motion.div>

          {/* Integrated Stats Bar */}
          <div className="grid grid-cols-3 gap-4 sm:gap-6 pt-6 sm:pt-10 border-t border-white/5 max-w-md">
            {[
              { number: "5+", label: "Years Experience" },
              { number: "2k+", label: "Happy Clients" },
              { number: "15+", label: "Expert Stylists" },
            ].map((stat, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 + idx * 0.1 }}>
                <p className="text-xl sm:text-2xl font-serif font-black text-[#E8B88A]">{stat.number}</p>
                <p className="text-stone-500 md:text-stone-600 text-[7px] sm:text-[8px] uppercase tracking-[0.15em] font-bold mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>

      </section>



      {/* About Section - Storytelling Redesign */}
      <section id="about" className="py-32 px-6 md:px-12 bg-[#0A0A0A] relative overflow-hidden border-t border-white/5">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-16 items-center relative z-10">

          {/* Left: Dynamic Grid Showcase */}
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-6 relative h-[500px] md:h-[600px] group"
          >
            {/* Background glowing blobs */}
            <div className="absolute -top-10 -right-10 w-52 h-52 bg-[#E8B88A]/5 rounded-full blur-[80px]" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#C77DFF]/5 rounded-full blur-[70px]" />

            {/* Accent Border Layout */}
            <div className="absolute inset-0 border border-[#E8B88A]/20 -translate-x-4 translate-y-4 rounded-3xl group-hover:translate-x-[-8px] group-hover:translate-y-[8px] transition-transform duration-700" />

            {/* Main Image */}
            <div className="absolute inset-0 rounded-3xl overflow-hidden bg-zinc-900 border border-white/5 shadow-2xl">
              <Image
                src="/about.png"
                alt="Royal Glow Salon Interior"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover group-hover:scale-105 transition-transform duration-[2000ms]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>

            {/* Overlapping Floating Glass Badge */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="absolute -bottom-6 -left-4 md:-left-8 bg-black/60 backdrop-blur-2xl p-6 rounded-2xl border border-white/5 max-w-[260px] shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
            >
              <div className="flex gap-1 mb-2.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <svg key={i} className="w-3.5 h-3.5 fill-[#E8B88A]" viewBox="0 0 24 24">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                ))}
              </div>
              <p className="text-white font-serif text-sm leading-snug mb-3">
                &ldquo;The atmosphere is unmatched. Truly the best salon experience I&apos;ve had.&rdquo;
              </p>
              <div>
                <p className="text-[9px] font-bold text-white uppercase tracking-wider">Elena Rodriguez</p>
                <p className="text-[8px] text-[#E8B88A] uppercase tracking-widest mt-0.5">Verified Client</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Immersive philosophy details */}
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}
            className="lg:col-span-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E8B88A]/5 border border-[#E8B88A]/10 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8B88A] animate-pulse" />
              <span className="text-[#E8B88A] tracking-[0.25em] uppercase text-[9px] font-black">The Royal Philosophy</span>
            </div>

            <h2 className="text-3xl md:text-5xl font-serif mb-8 leading-tight text-white">
              The Intersection of <br />
              <span className="italic font-bold bg-gradient-to-r from-[#E8B88A] to-[#C77DFF] bg-clip-text text-transparent">Artistry & Wellness</span>
            </h2>

            <div className="space-y-5 text-stone-400 leading-relaxed font-light text-sm max-w-xl">
              <p>
                Founded in <strong className="text-white font-medium">2018</strong>, Royal Glow Salon was envisioned as more than just a place for grooming. It was designed as a sanctuary where the hustle of Matara fades into the background, and your transformation takes center stage.
              </p>
              <p>
                Our philosophy is simple: <span className="italic font-serif text-white">True beauty is an expression of inner confidence.</span> We combine centuries-old techniques with modern innovation, ensuring that every visit is a bespoke experience tailored to your unique narrative.
              </p>
            </div>

            <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-start sm:items-center gap-8">
              <div>
                <p className="text-[8px] uppercase tracking-[0.2em] text-stone-500 font-bold mb-3">Founder & Creative Director</p>
                <div className="flex items-center gap-3.5">

                  <div>
                    <p className="text-base font-serif text-white font-bold">Sarah Jenkins</p>
                    <p className="text-[10px] text-[#E8B88A] font-bold mt-0.5">Master Hair Stylist</p>
                  </div>
                </div>
              </div>
              <div className="h-10 w-px bg-white/5 hidden sm:block" />
              <div>
                <p className="text-xs text-stone-500 font-light leading-relaxed">Trusted by <span className="text-white font-bold">2,500+</span> individuals in Matara</p>
              </div>
            </div>
          </motion.div>

        </div>
      </section>



      {/* Services & Features - Bento Grid Style */}
      <section className="py-32 px-6 md:px-12 bg-[#0F0F0F] relative overflow-hidden border-t border-white/5">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#E8B88A]/3 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">

          {/* Section Header */}
          <div className="text-center mb-24">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#E8B88A]/10 bg-[#E8B88A]/5 mb-4"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8B88A] animate-pulse" />
              <span className="text-[#E8B88A] tracking-[0.25em] uppercase text-[9px] font-black">Menu of Services</span>
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="text-3xl md:text-5xl lg:text-6xl font-serif mb-6 text-white tracking-tight"
            >
              Elevated Salon <span className="italic font-bold bg-gradient-to-r from-[#E8B88A] to-[#C77DFF] bg-clip-text text-transparent">Experience</span>
            </motion.h2>
          </div>

          <div className="grid lg:grid-cols-12 gap-12">
            {/* Services columns */}
            <div className="lg:col-span-8 flex flex-col gap-10">
              <div className="grid md:grid-cols-2 gap-8">
                {["Men", "Women"].map((catName, idx) => {
                  const catItems = servicesData.filter(s => s.category.startsWith(catName));
                  if (catItems.length === 0) return null;
                  return (
                    <motion.div
                      key={catName}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.2 }}
                      className="bg-white/[0.01] border border-white/5 rounded-3xl p-6 md:p-8"
                    >
                      <div className="mb-6 flex items-center gap-3.5 border-b border-white/5 pb-4">
                        <span className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5">
                          {catName === "Men" ? (
                            <svg className="w-5 h-5 text-[#E8B88A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" /></svg>
                          ) : (
                            <svg className="w-5 h-5 text-[#E8B88A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                          )}
                        </span>
                        <h3 className="text-xl font-serif text-white tracking-widest font-black uppercase">{catName}</h3>
                      </div>

                      <ul className="space-y-1">
                        {catItems.map((item, i) => (
                          <li key={item.id} className="group flex flex-col py-3.5 border-b border-white/5 hover:border-[#E8B88A]/20 transition-all duration-300">
                            <div className="flex items-center justify-between gap-3 w-full">
                              <span className="text-stone-300 text-sm group-hover:text-white transition-colors">{item.name}</span>
                              <div className="flex-1 border-b border-dashed border-white/10 group-hover:border-[#E8B88A]/35 mx-3 transition-colors"></div>
                              <span className="text-[#E8B88A] font-serif text-base tracking-wide whitespace-nowrap">Rs. {item.price}</span>
                            </div>
                            <span className="text-[9px] uppercase tracking-[0.15em] text-stone-500 mt-1 font-bold">{item.duration} Min</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )
                })}
              </div>

              <div className="pt-4 text-center md:text-left">
                <Link href="/services" className="inline-flex items-center gap-2.5 text-black bg-gradient-to-r from-[#E8B88A] to-[#D4A574] hover:shadow-[0_0_30px_rgba(232,184,138,0.35)] px-8 py-4 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 group">
                  Explore Full Menu
                  <svg className="w-3.5 h-3.5 text-black group-hover:translate-x-1.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </Link>
              </div>
            </div>

            {/* Premium Features Bento Box */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}
              className="lg:col-span-4"
            >
              <div className="bg-white/[0.01] p-8 border border-white/5 rounded-3xl h-full flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8B88A]/5 rounded-full blur-[40px]" />
                <div className="relative z-10 mb-8 border-b border-white/5 pb-6">
                  <p className="text-[#E8B88A] tracking-[0.25em] uppercase text-[9px] mb-2 font-black">The Royal Standard</p>
                  <h3 className="text-2xl font-serif text-white leading-tight font-light">Expertise & <br /><span className="italic font-bold bg-gradient-to-r from-[#E8B88A] to-[#C77DFF] bg-clip-text text-transparent">Innovation</span></h3>
                </div>

                <div className="space-y-6 relative z-10">
                  {aboutFeatures.slice(2, 5).map((feature, idx) => (
                    <div key={idx} className="flex gap-4 group">
                      <div className="text-[#E8B88A] shrink-0 w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-[#E8B88A]/10 group-hover:scale-105 transition-all duration-500 shadow-sm">
                        {feature.icon}
                      </div>
                      <div>
                        <h5 className="text-white font-serif text-base mb-1 font-bold">{feature.title}</h5>
                        <p className="text-stone-400 text-xs leading-relaxed font-light">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Reviews />

      {/* Look Book Section */}
      <section className="py-32 px-6 md:px-12 bg-[#0A0A0A] relative overflow-hidden border-t border-white/5">
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#C77DFF]/2 rounded-full blur-[100px] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E8B88A]/5 border border-[#E8B88A]/10 mb-4"
            >
              <span className="text-[#E8B88A] tracking-[0.25em] uppercase text-[9px] font-black">The Portfolio</span>
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="text-3xl md:text-5xl font-serif text-white tracking-tight"
            >The Look <span className="italic font-bold bg-gradient-to-r from-[#E8B88A] to-[#C77DFF] bg-clip-text text-transparent">Book</span></motion.h2>
          </div>

          <div className="columns-2 md:columns-3 lg:columns-4 gap-5 space-y-5">
            {lookbookData.map((img, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: idx * 0.04 }}
                className="break-inside-avoid group relative overflow-hidden rounded-2xl border border-white/5 shadow-sm hover:shadow-xl transition-all duration-500"
              >
                <Image src={img.src} alt={img.alt || "Lookbook Image"} width={600} height={400}
                  className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section - Immersive Cinematic Redesign */}
      <section id="contact" className="relative py-32 md:py-40 flex items-center justify-center overflow-hidden min-h-[850px] border-t border-white/5">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <Image src="/salon-contact.png" alt="Royal Glow Salon" fill className="object-cover object-center brightness-[0.4]" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/35" />
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 w-full flex flex-col lg:flex-row justify-between items-center gap-16">

          {/* Left: Heading & Intro */}
          <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="max-w-xl">
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/10 bg-white/[0.02] backdrop-blur-md mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8B88A] animate-pulse" />
              <span className="text-white tracking-[0.25em] uppercase text-[9px] font-black">Connect With Us</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-serif text-white leading-tight mb-6">
              Plan Your <br /><span className="italic font-bold bg-gradient-to-r from-[#E8B88A] to-[#C77DFF] bg-clip-text text-transparent">Transformation</span>
            </h2>
            <p className="text-stone-400 text-sm font-light leading-relaxed mb-10 max-w-sm">
              Whether you need a consultation or are ready to book your next visit, our concierge team is at your service to curate your luxury salon experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/?book=true" className="group inline-flex justify-center items-center gap-3 bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black px-8 py-4 rounded-full tracking-[0.2em] uppercase text-[10px] font-black hover:shadow-[0_0_30px_rgba(232,184,138,0.4)] transition-all duration-500">
                Book Appointment
                <svg className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </div>
          </motion.div>

          {/* Right: Glassmorphism Contact Cards */}
          <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="w-full max-w-md space-y-4"
          >
            {[
              { title: "Reservations", value: "+94 41 222 3456", sub: "Available Daily 9 AM - 8 PM", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /> },
              { title: "General Inquiries", value: "royalglow@gmail.com", sub: "Replies within 24 business hours", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /> },
              { title: "Flagship Location", value: "Beach Road, Matara", sub: "Sri Lanka", icon: <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></> }
            ].map((item, idx) => (
              <div key={idx} className="group relative overflow-hidden rounded-3xl bg-white/[0.01] backdrop-blur-md border border-white/5 p-6 flex items-start gap-5 hover:bg-white/[0.03] hover:border-white/10 transition-all duration-500 cursor-default shadow-2xl">
                <div className="absolute -right-10 -top-10 w-24 h-24 bg-[#E8B88A]/5 rounded-full blur-[30px] group-hover:bg-[#E8B88A]/10 transition-colors" />
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0 text-[#E8B88A] group-hover:scale-105 transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">{item.icon}</svg>
                </div>
                <div className="relative z-10 pt-1">
                  <p className="text-[8px] uppercase tracking-[0.2em] text-stone-500 font-black mb-1.5">{item.title}</p>
                  <p className="text-white font-serif text-lg tracking-wide mb-0.5 group-hover:text-[#E8B88A] transition-colors">{item.value}</p>
                  <p className="text-stone-400 text-xs font-light leading-relaxed">{item.sub}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Map Section */}
      <section className="mx-6 md:mx-12 mb-10 relative">
        <div className="rounded-3xl overflow-hidden relative border border-white/5" style={{ height: '420px' }}>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d63542.03706908!2d80.498!3d5.9489!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae138d151937cd9%3A0x1d711f45fa81947d!2sMatara!5e0!3m2!1sen!2slk!4v1696000000000"
            width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
            title="Royal Glow Salon Location – Matara"
            className="grayscale brightness-[0.6] hover:grayscale-0 hover:brightness-100 transition-all duration-700"
          />
          {/* Overlay badge */}
          <div className="absolute top-6 left-6 bg-black/85 backdrop-blur-xl rounded-2xl px-5 py-3 border border-white/5 shadow-lg flex items-center gap-3 z-10">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#E8B88A] to-[#D4A574] flex items-center justify-center">
              <svg className="w-4 h-4 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div>
              <p className="text-[8px] uppercase tracking-[0.15em] text-[#E8B88A] font-black">Royal Glow Salon</p>
              <p className="text-stone-300 text-xs font-serif">Beach Road, Matara</p>
            </div>
          </div>
        </div>
      </section>

    </main >
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
