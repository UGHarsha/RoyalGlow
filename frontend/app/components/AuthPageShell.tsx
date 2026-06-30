"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

type AuthPageShellProps = {
  title: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export default function AuthPageShell({
  title,
  subtitle,
  children,
  footer,
}: AuthPageShellProps) {
  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-20 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-[#E8B88A]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#C77DFF]/5 rounded-full blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-5 group">
            <Image
              src="/wite.png"
              alt="Royal Glow Logo"
              width={56}
              height={56}
              className="mx-auto object-contain filter drop-shadow-[0_0_12px_rgba(232,184,138,0.25)] group-hover:scale-105 transition-transform duration-500"
            />
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8B88A]/10 border border-[#E8B88A]/10 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#E8B88A]" />
            <span className="text-[9px] tracking-[0.2em] uppercase font-bold text-[#E8B88A]">
              Royal Glow Salon
            </span>
          </div>
          <h1 className="text-3xl font-serif text-white font-light">{title}</h1>
          <p className="text-stone-500 text-xs mt-2">{subtitle}</p>
        </div>

        <div className="bg-white/[0.01] border border-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] relative">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#E8B88A]/50 to-[#C77DFF]/50 rounded-t-3xl" />
          {children}
          {footer}
        </div>
      </motion.div>
    </div>
  );
}
