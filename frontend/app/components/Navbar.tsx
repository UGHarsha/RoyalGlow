"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../../utils/supabase";
import { User } from "@supabase/supabase-js";
import { Menu, X, Scissors, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut } from 'lucide-react';
export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showNavbar, setShowNavbar] = useState(true);
  const prevScrollPos = useRef(0);
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      // Check if user is admin
      if (currentUser) {
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
        const isUserAdmin = currentUser.user_metadata?.role === 'admin' || currentUser.email === adminEmail;
        setIsAdmin(isUserAdmin);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
        const isUserAdmin = currentUser.user_metadata?.role === 'admin' || currentUser.email === adminEmail;
        setIsAdmin(isUserAdmin);
      } else {
        setIsAdmin(false);
      }
    });

    const handleScroll = () => {
      const currentScrollPos = window.scrollY;
      setScrolled(currentScrollPos > 20);

      if (currentScrollPos > prevScrollPos.current && currentScrollPos > 80) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }
      prevScrollPos.current = currentScrollPos;
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "/#about" },
    { name: "Services", href: "/services" },
    { name: "Virtual Try-On", href: "/recolor" },
    { name: "Contact Us", href: "/#contact" },
  ];

  if (user) {
    navLinks.push({ name: "Appointments", href: "/bookings" });
    if (isAdmin) {
      navLinks.push({ name: "Members", href: "/users" });
    }
  }

  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const isSolid = scrolled || pathname !== "/";

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-500 ${isSolid
          ? "bg-[#0A0A0A]/85 backdrop-blur-xl border-b border-white/5 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.8)]"
          : "bg-transparent py-6"
          } ${(showNavbar || isOpen) ? "translate-y-0" : "-translate-y-full"}`}
      >
        <div className="w-full max-w-[95rem] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-3 group z-50 shrink-0">
              <Image
                src="/wite.png"
                alt="Royal Glow Logo"
                width={48}
                height={48}
                style={{ width: "auto" }}
                className="object-contain filter drop-shadow-[0_0_8px_rgba(232,184,138,0.3)] group-hover:scale-105 transition-transform duration-500"
              />

              <span className="font-serif tracking-[0.3em] text-sm text-white group-hover:text-[#E8B88A] transition-colors hidden lg:block whitespace-nowrap">
                ROYAL GLOW
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-3 lg:gap-4 xl:gap-5 shrink min-w-0">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-[10px] lg:text-xs font-semibold uppercase tracking-[0.15em] lg:tracking-[0.2em] xl:tracking-[0.25em] transition-colors relative group whitespace-nowrap text-white/70 hover:text-white shrink-0"
                >
                  {link.name === "Virtual Try-On" ? (
                    <>
                      <span className="xl:hidden">Try-On</span>
                      <span className="hidden xl:inline">Virtual Try-On</span>
                    </>
                  ) : link.name === "Contact Us" ? (
                    <>
                      <span className="xl:hidden">Contact</span>
                      <span className="hidden xl:inline">Contact Us</span>
                    </>
                  ) : (
                    link.name
                  )}
                  <span className="absolute -bottom-1.5 left-0 w-0 h-[2px] transition-all duration-300 group-hover:w-full bg-gradient-to-r from-[#E8B88A] to-[#C77DFF]"></span>
                </Link>
              ))}

              <div className="h-5 w-px bg-white/10 mx-0.5 shrink-0"></div>

              {user ? (
                <>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      title="Admin Panel"
                      aria-label="Admin Panel"
                      className="transition-colors flex items-center shrink-0 text-[#E8B88A] hover:text-[#D4A574] p-1.5 rounded-md hover:bg-white/5"
                    >
                      <Shield className="w-4 h-4" />
                      <span className="sr-only">Admin Panel</span>
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    aria-label="Logout"
                    className="transition-colors shrink-0 text-white/70 hover:text-white p-1.5 rounded-md hover:bg-white/5"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                  <Link
                    href="/?book=true"
                    className="text-[10px] font-black uppercase tracking-[0.2em] px-4 lg:px-5 py-2.5 lg:py-3 transition-all duration-500 whitespace-nowrap shrink-0 bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black rounded-full hover:shadow-[0_0_30px_rgba(232,184,138,0.4)] hover:scale-105 active:scale-95"
                  >
                    Booking Appointment
                  </Link>
                </>
              ) : (
                <Link
                  href="/login"
                  className="text-xs font-semibold uppercase tracking-[0.2em] transition-colors text-white/70 hover:text-white"
                >
                  Sign In
                </Link>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={toggleMenu}
                className="relative z-[10000] p-2.5 transition-colors text-white -mr-1"
                aria-label={isOpen ? "Close menu" : "Open menu"}
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu - rendered outside nav for proper z-index stacking */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden fixed inset-0 z-[9999] bg-[#0A0A0A] pt-24 px-6 sm:px-8 flex flex-col space-y-5 overflow-y-auto"
          >
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                onClick={toggleMenu}
                className="text-lg font-serif text-white/90 border-b border-white/5 pb-3 tracking-wider"
              >
                {link.name}
              </Link>
            ))}

            <div className="pt-4 flex flex-col space-y-4">
              {user ? (
                <>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={toggleMenu}
                      className="text-sm font-medium text-[#E8B88A] flex items-center gap-2 border-b border-white/5 pb-4"
                    >
                      <Shield className="w-5 h-5" />
                      Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      handleLogout();
                      toggleMenu();
                    }}
                    className="text-sm font-medium text-white/70 text-left"
                  >
                    Logout
                  </button>
                  <Link
                    href="/?book=true"
                    onClick={toggleMenu}
                    className="bg-gradient-to-r from-[#E8B88A] to-[#D4A574] text-black text-center py-4 text-xs font-bold uppercase tracking-widest mt-4 rounded-full"
                  >
                    Book Appointment
                  </Link>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={toggleMenu}
                  className="text-sm font-medium text-white/70"
                >
                  Sign In
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
