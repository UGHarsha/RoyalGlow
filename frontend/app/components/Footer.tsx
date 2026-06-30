"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function Footer() {
    const pathname = usePathname();

    if (pathname?.startsWith("/admin")) {
        return null;
    }

    return (
        <footer className="bg-[#050505] text-stone-400 py-16 px-6 border-t border-white/5 relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#E8B88A]/2 rounded-full blur-[100px] pointer-events-none" />
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">

                    {/* Brand */}
                    <div className="space-y-4">
                        <Link href="/" className="inline-block group">
                            <Image src="/wite.png" alt="Royal Glow" width={50} height={50} style={{ width: "auto" }} className="mb-3 opacity-90 group-hover:scale-105 transition-transform" />
                            <h2 className="text-white font-serif text-xl tracking-[0.25em] uppercase">Royal Glow</h2>
                        </Link>
                        <p className="text-xs font-light leading-relaxed max-w-xs text-stone-400">
                            Elevating the standard of beauty in Matara. We combine traditional artistry with modern innovation to create timeless transformations.
                        </p>
                        <div className="flex gap-3">
                            {["facebook", "instagram", "twitter"].map((social) => (
                                <a
                                    key={social}
                                    href="#"
                                    className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center hover:border-[#E8B88A] hover:text-[#E8B88A] transition-all group"
                                >
                                    <span className="text-[10px] uppercase tracking-tighter opacity-70 group-hover:opacity-100 font-bold">{social.charAt(0)}</span>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="space-y-4">
                        <h4 className="text-white text-[10px] uppercase tracking-[0.3em] font-black text-[#E8B88A]">The House</h4>
                        <ul className="space-y-3">
                            {["Home", "About", "Services", "Reviews", "Virtual Try-On"].map((item) => (
                                <li key={item}>
                                    <Link
                                        href={item === "Home" ? "/" : item === "About" ? "/#about" : `/${item.toLowerCase().replace(/ /g, "-")}`}
                                        className="text-xs hover:text-[#E8B88A] transition-colors font-light text-stone-400"
                                    >
                                        {item}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div className="space-y-4">
                        <h4 className="text-white text-[10px] uppercase tracking-[0.3em] font-black text-[#E8B88A]">Inquiries</h4>
                        <ul className="space-y-4 text-xs font-light text-stone-400">
                            <li className="flex gap-3">
                                <span className="text-[#E8B88A] shrink-0 font-black">A</span>
                                <span>Beach Road, Matara<br />Sri Lanka</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-[#E8B88A] shrink-0 font-black">T</span>
                                <span>+94 41 222 3456</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-[#E8B88A] shrink-0 font-black">E</span>
                                <span className="border-b border-white/5 pb-0.5">royalglow.com</span>
                            </li>
                        </ul>
                    </div>

                    {/* Appointment */}
                    <div className="space-y-4">
                        <h4 className="text-white text-[10px] uppercase tracking-[0.3em] font-black text-[#E8B88A]">Availability</h4>
                        <div className="space-y-3 text-xs font-light text-stone-400 mb-6">
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span>Mon — Sat</span>
                                <span className="text-white">9:00 — 20:00</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span>Sunday</span>
                                <span className="text-white">10:00 — 16:00</span>
                            </div>
                        </div>
                        <Link
                            href="/?book=true"
                            className="inline-block bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black px-8 py-3.5 uppercase tracking-[0.2em] text-[10px] font-black rounded-full hover:shadow-[0_0_25px_rgba(232,184,138,0.3)] hover:scale-105 transition-all"
                        >
                            Reserve Now
                        </Link>
                    </div>

                </div>

                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[9px] uppercase tracking-[0.2em] font-bold text-stone-600">
                    <p>© {new Date().getFullYear()} Royal Glow Salon</p>
                    <div className="flex gap-8">
                        <Link href="/privacy" className="hover:text-stone-400">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-stone-400">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
