"use client";

import { useState, useEffect, FormEvent } from "react";
import { supabase } from "../../utils/supabase";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

type Review = {
    id: number;
    customer_name: string;
    rating: number;
    comment: string;
    created_at: string;
};

export default function ReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        customer_name: "",
        rating: 5,
        comment: "",
    });
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        fetchReviews();
    }, []);

    async function fetchReviews() {
        setLoading(true);
        const { data, error } = await supabase
            .from("reviews")
            .select("*")
            .order("created_at", { ascending: false });

        if (!error && data) {
            setReviews(data);
        }
        setLoading(false);
    }

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setSubmitting(true);
        setErrorMsg("");
        setSuccess(false);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
            setErrorMsg("Please sign in to share your experience.");
            setSubmitting(false);
            return;
        }

        const { error } = await supabase.from("reviews").insert([
            {
                user_id: session.user.id,
                customer_name: form.customer_name,
                rating: form.rating,
                comment: form.comment,
            },
        ]);

        if (error) {
            setErrorMsg("Unable to submit review. Please try again later.");
        } else {
            setSuccess(true);
            setForm({ customer_name: "", rating: 5, comment: "" });
            fetchReviews();
        }
        setSubmitting(false);
    }

    const renderStars = (rating: number, interactive = false) => {
        return (
            <div className="flex gap-1 text-[#C69C6D]">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        disabled={!interactive}
                        onClick={() => interactive && setForm({ ...form, rating: star })}
                        className={`${interactive ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}
                    >
                        <svg
                            className={`w-5 h-5 ${star <= (interactive ? form.rating : rating) ? "fill-current" : "text-stone-200 fill-transparent stroke-current stroke-2"}`}
                            viewBox="0 0 24 24"
                        >
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                        </svg>
                    </button>
                ))}
            </div>
        );
    };

    return (
        <main className="min-h-screen bg-[#FDFBF7] font-sans text-[#3E2723]">
            {/* Header */}
            <section className="relative h-[40vh] items-center justify-center flex overflow-hidden">
                <Image src="/salon.jpg" alt="Reviews Background" fill className="object-cover brightness-[0.3]" />
                <div className="relative z-10 text-center px-6">
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[#C69C6D] tracking-[0.4em] uppercase text-[10px] mb-4 font-bold"
                    >
                        Community Reflections
                    </motion.p>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-serif text-white tracking-tight uppercase"
                    >
                        Guest Reviews
                    </motion.h1>
                </div>
            </section>

            <div className="max-w-7xl mx-auto px-6 py-24">
                <div className="grid lg:grid-cols-12 gap-20">

                    {/* Form Sidebar */}
                    <div className="lg:col-span-4">
                        <div className="sticky top-32 p-10 bg-white border border-stone-100 rounded-3xl shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full bg-[#C69C6D]"></div>
                            <h3 className="text-2xl font-serif mb-8">Share Your <br />Experience</h3>

                            {success ? (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
                                    <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                    <p className="text-sm text-stone-500 mb-6">Thank you for your kind words. Your review is now live.</p>
                                    <button onClick={() => setSuccess(false)} className="text-[#C69C6D] text-[10px] uppercase tracking-widest font-bold">Write Another</button>
                                </motion.div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-8">
                                    {errorMsg && <p className="text-red-500 text-[10px] uppercase tracking-widest bg-red-50 p-3 text-center">{errorMsg}</p>}

                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={form.customer_name}
                                            onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                                            className="w-full bg-stone-50 border-none px-4 py-3 rounded-xl focus:ring-1 focus:ring-[#C69C6D] transition-all"
                                            placeholder="John Doe"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Rating</label>
                                        {renderStars(0, true)}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-stone-400">Review</label>
                                        <textarea
                                            required
                                            rows={5}
                                            value={form.comment}
                                            onChange={(e) => setForm({ ...form, comment: e.target.value })}
                                            className="w-full bg-stone-50 border-none px-4 py-3 rounded-xl focus:ring-1 focus:ring-[#C69C6D] transition-all resize-none"
                                            placeholder="Describe your visit..."
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full bg-[#3E2723] text-white py-4 rounded-xl uppercase tracking-[0.2em] text-[10px] font-bold hover:bg-[#C69C6D] transition-all shadow-xl disabled:opacity-50"
                                    >
                                        {submitting ? "Publishing..." : "Publish Review"}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Feed */}
                    <div className="lg:col-span-8">
                        <div className="flex items-center justify-between mb-12">
                            <h2 className="text-3xl font-serif">Client Chronicles</h2>
                            <div className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">
                                showing <span className="text-[#3E2723]">{reviews.length}</span> stories
                            </div>
                        </div>

                        <div className="space-y-10">
                            {loading ? (
                                [1, 2, 3].map(i => <div key={i} className="h-64 bg-stone-100 animate-pulse rounded-3xl" />)
                            ) : reviews.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-3xl border border-stone-100">
                                    <p className="text-stone-400 italic">No chronicles yet. Be the first to tell yours.</p>
                                </div>
                            ) : (
                                <AnimatePresence>
                                    {reviews.map((review, idx) => (
                                        <motion.div
                                            key={review.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="bg-white p-10 rounded-3xl border border-stone-50 shadow-sm hover:shadow-xl transition-all duration-500 group"
                                        >
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 text-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-[#FDFBF7] border border-stone-100 rounded-full flex items-center justify-center font-serif text-[#C69C6D] text-xl font-bold">
                                                        {review.customer_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-serif text-xl mb-1">{review.customer_name}</h4>
                                                        <p className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Verified Story</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    {renderStars(review.rating)}
                                                    <div className="h-4 w-px bg-stone-100 hidden md:block"></div>
                                                    <div className="text-[10px] uppercase tracking-widest text-stone-300">
                                                        {new Date(review.created_at).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-stone-500 leading-relaxed font-light text-lg italic pr-12 relative">
                                                <span className="text-5xl text-[#C69C6D] absolute -top-4 -left-2 opacity-10 font-serif">"</span>
                                                {review.comment}
                                            </p>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* CTA */}
            <section className="bg-[#3E2723] py-24 px-6 text-center">
                <p className="text-[#C69C6D] tracking-[0.3em] uppercase text-[10px] mb-6 font-bold">Your Story Awaits</p>
                <h2 className="text-3xl md:text-5xl font-serif text-white mb-10 uppercase tracking-widest">Ready for a <br /> transformation?</h2>
                <Link href="/?book=true" className="inline-block bg-[#C69C6D] text-white px-12 py-5 rounded-xl uppercase tracking-widest text-[10px] font-bold hover:bg-white hover:text-[#3E2723] transition-all shadow-2xl">Book Now</Link>
            </section>
        </main>
    );
}
