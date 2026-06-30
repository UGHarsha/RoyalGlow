"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Sparkles, Clock, ChevronRight, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ServicesPage() {
    const [servicesData, setServicesData] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<"women" | "men">("women");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        async function fetchServices() {
            try {
                const response = await fetch("/api/services");
                if (response.ok) {
                    const data = await response.json();
                    setServicesData(data);
                }
            } catch (err) {
                console.error("Error fetching services:", err);
            }
        }
        fetchServices();
    }, []);

    const filteredServices = servicesData.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const menServices = filteredServices.filter(s => s.category.startsWith("Men") || s.category === "Men");
    const womenServices = filteredServices.filter(s => s.category.startsWith("Women") || s.category === "Women");

    const menSubcategories = ["Face", "Hair", "Bridal Full"];
    const womenSubcategories = ["Face", "Hair", "Nails", "Bridal Full"];

    const currentServices = activeTab === "men" ? menServices : womenServices;
    const currentSubcategories = activeTab === "men" ? menSubcategories : womenSubcategories;

    return (
        <main className="min-h-screen bg-[#0A0A0A] font-sans text-stone-300 overflow-hidden relative">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#E8B88A]/5 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-[#C77DFF]/5 rounded-full blur-[120px] pointer-events-none animate-pulse-subtle" />
            <div className="absolute bottom-10 left-10 w-[300px] h-[300px] bg-[#E8B88A]/3 rounded-full blur-[100px] pointer-events-none" />

            {/* Hero Header */}
            <section className="relative h-[45vh] md:h-[50vh] flex items-center justify-center overflow-hidden">
                <Image src="/salon.jpg" alt="Luxury Salon Interior" fill className="object-cover scale-105" priority />
                {/* Dark overlays */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/50 to-[#0A0A0A] z-[1]" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60 z-[1]" />

                <div className="relative z-10 text-center px-6 mt-12">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/5 bg-white/[0.02] backdrop-blur-md mb-6"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-[#E8B88A]" />
                        <span className="text-[9px] tracking-[0.3em] uppercase font-bold text-stone-300">The Salon Menu</span>
                    </motion.div>
                    <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }}
                        className="text-4xl md:text-6xl font-serif text-white mb-4 tracking-tight font-light"
                    >
                        Our <span className="italic font-bold bg-gradient-to-r from-[#E8B88A] to-[#C77DFF] bg-clip-text text-transparent">Services</span>
                    </motion.h1>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                        className="max-w-md mx-auto text-stone-400 text-xs md:text-sm font-light leading-relaxed"
                    >
                        Immerse yourself in our curated treatments designed to revitalize your look and style narrative.
                    </motion.p>
                </div>
            </section>

            {/* Services Content */}
            <section className="py-12 md:py-16 px-6 md:px-12 max-w-6xl mx-auto min-h-[600px] relative z-10">
                {/* Tabs & Search */}
                <div className="flex flex-col items-center mb-16 space-y-6">
                    {/* Tab Switcher */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="inline-flex p-1 rounded-full bg-white/[0.02] border border-white/5 shadow-inner backdrop-blur-md"
                    >
                        {(["women", "men"] as const).map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                className={`relative px-6 md:px-10 py-3 rounded-full text-xs font-semibold tracking-wider uppercase transition-all duration-300 flex items-center gap-2 ${activeTab === tab
                                    ? "bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black shadow-lg"
                                    : "text-stone-400 hover:text-white"
                                    }`}
                            >
                                {tab === "women" ? (
                                    <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>Women&apos;s Styling</>
                                ) : (
                                    <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>Men&apos;s Grooming</>
                                )}
                            </button>
                        ))}
                    </motion.div>

                    {/* Search */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                        className="w-full max-w-md relative"
                    >
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                            <Search className="w-4 h-4 text-stone-500" />
                        </div>
                        <input type="text" placeholder="Search treatments..."
                            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="booking-input pl-12 pr-6 !py-3.5 !rounded-full shadow-sm text-sm"
                        />
                    </motion.div>
                </div>

                {/* Services Grid */}
                <AnimatePresence mode="wait">
                    <motion.div key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4 }}
                        className="max-w-4xl mx-auto"
                    >
                        {currentServices.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="w-16 h-16 bg-[#E8B88A]/5 border border-[#E8B88A]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-6">
                                    <Search className="w-6 h-6 text-[#E8B88A]" />
                                </div>
                                <p className="text-stone-400 text-base font-light mb-2">
                                    {servicesData.length === 0 ? "Loading services..." : "No services found"}
                                </p>
                                <p className="text-stone-500 text-xs">
                                    {servicesData.length === 0 ? "Connecting to salon database..." : "Try adjusting your search query."}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-12">
                                {currentSubcategories.map((subcat, catIdx) => {
                                    const prefix = activeTab === "men" ? "Men" : "Women";
                                    const subServices = currentServices.filter(s =>
                                        s.category === `${prefix} - ${subcat}` || (subcat === 'Hair' && s.category === prefix)
                                    );
                                    if (subServices.length === 0) return null;
                                    return (
                                        <motion.div key={subcat}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: catIdx * 0.1 }}
                                        >
                                            {/* Subcategory Header */}
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E8B88A]/10 to-[#E8B88A]/5 border border-[#E8B88A]/10 flex items-center justify-center">
                                                    <span className="text-[#E8B88A] text-xs font-bold">{String(catIdx + 1).padStart(2, '0')}</span>
                                                </div>
                                                <h3 className="text-lg font-serif text-white font-medium">{subcat}</h3>
                                                <div className="flex-1 h-px bg-gradient-to-r from-white/5 to-transparent" />
                                                <span className="text-[8px] uppercase tracking-[0.15em] text-stone-500 font-bold">{subServices.length} {subServices.length === 1 ? 'service' : 'services'}</span>
                                            </div>

                                            {/* Service Cards */}
                                            <div className="grid gap-3.5">
                                                {subServices.map((service, idx) => (
                                                    <motion.div key={idx}
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: catIdx * 0.1 + idx * 0.05 }}
                                                        className="group bg-white/[0.01] border border-white/5 rounded-2xl p-5 md:p-6 hover:bg-white/[0.03] hover:border-[#E8B88A]/20 transition-all duration-300 relative overflow-hidden"
                                                    >
                                                        {/* Accent bar */}
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#E8B88A] to-transparent rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                            <div className="flex-1">
                                                                <h4 className="text-base font-serif text-white group-hover:text-[#E8B88A] transition-colors duration-300 mb-1">
                                                                    {service.name}
                                                                </h4>
                                                                <p className="text-stone-400 text-xs leading-relaxed font-light">
                                                                    {service.description || "A professional service tailored to your style."}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-4 md:text-right shrink-0">
                                                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-stone-400">
                                                                    <Clock className="w-3 h-3 text-[#E8B88A]" />
                                                                    <span className="text-[10px] font-medium">{service.duration} min</span>
                                                                </div>
                                                                <div className="px-4 py-2 rounded-full bg-gradient-to-r from-[#E8B88A]/10 to-[#E8B88A]/5 text-[#E8B88A] font-bold text-xs border border-[#E8B88A]/10">
                                                                    Rs. {service.price}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </section>

            {/* Expert Tip */}
            <section className="py-12 px-6 relative overflow-hidden z-10">
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className="max-w-3xl mx-auto relative"
                >
                    <div className="bg-gradient-to-br from-[#0F0F0F] to-[#0A0A0A] rounded-2xl border border-white/5 overflow-hidden relative p-8 md:p-12 animate-border-glow">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-[#E8B88A]/5 rounded-full blur-[60px]" />

                        <div className="grid md:grid-cols-[1fr_200px] gap-8 items-center">
                            <div className="relative z-10">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8B88A]/10 mb-4 border border-[#E8B88A]/10">
                                    <span className="text-xs">💡</span>
                                    <span className="text-[8px] uppercase tracking-[0.2em] text-[#E8B88A] font-bold">Expert Tip</span>
                                </div>
                                <h3 className="text-xl md:text-2xl font-serif text-white mb-3">Style Consultation <span className="gradient-text font-bold">Recommendation</span></h3>
                                <p className="text-stone-400 italic text-xs leading-relaxed mb-6">
                                    &quot;For first-time color transformations, we always recommend a consultation 48 hours prior. This allows us to perfectly plan your color map.&quot;
                                </p>
                                <Link href="/?book=ai"
                                    className="inline-flex items-center gap-2.5 bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black px-5 py-2.5 rounded-full tracking-[0.1em] uppercase text-[9px] font-bold hover:shadow-[0_0_20px_rgba(232,184,138,0.3)] transition-all duration-300 hover:scale-105 active:scale-95 group"
                                >
                                    <span>✨</span>
                                    Consult with Bella AI
                                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </div>
                            {/* Right image */}
                            <div className="hidden md:block relative h-40 rounded-xl overflow-hidden border border-white/5">
                                <Image src="/salon-booking.png" alt="Expert Styling" fill className="object-cover opacity-60" />
                                <div className="absolute inset-0 bg-gradient-to-r from-[#0F0F0F] via-[#0F0F0F]/40 to-transparent" />
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Booking CTA */}
            <section className="py-16 px-6 text-center relative overflow-hidden z-10">
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    className="relative z-10"
                >
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8B88A]/10 mb-4 border border-[#E8B88A]/10">
                        <span className="w-1 h-1 rounded-full bg-[#E8B88A] animate-pulse" />
                        <span className="text-[#E8B88A] tracking-[0.2em] uppercase text-[8px] font-bold">Ready?</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-serif text-white mb-3">Reserve Your <span className="gradient-text italic font-bold">Moment</span></h2>
                    <p className="text-stone-400 mb-8 max-w-sm mx-auto font-light text-xs md:text-sm leading-relaxed">
                        Join us for a transformation that goes beyond the mirror. Secure your preferred time slot today.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link href="/?book=true"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black px-8 py-3.5 tracking-[0.15em] uppercase text-[10px] font-bold rounded-full hover:shadow-[0_0_30px_rgba(232,184,138,0.3)] transition-all duration-300 hover:scale-105 active:scale-95 group"
                        >
                            Instant Booking
                            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link href="/?book=ai"
                            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-white/10 bg-white/[0.01] text-stone-300 hover:border-[#E8B88A]/30 hover:text-[#E8B88A] transition-all duration-300 tracking-[0.15em] uppercase text-[10px] font-bold group"
                        >
                            <span>✨</span>
                            Ask Bella AI
                        </Link>
                    </div>
                </motion.div>
            </section>
        </main>
    );
}
