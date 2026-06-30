"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../utils/supabase";
import { API_BASE, jsonAuthHeaders } from "../../../utils/api";
import {
    Users, Trash2, Search,
    Mail, Clock, TrendingUp
} from "lucide-react";

interface Booking {
    id: string;
    customer_name: string;
    service: string;
    appointment_date: string;
    created_at: string;
    user_id?: string;
    user_email?: string;
}

interface Customer {
    id: string; // user_id or name if no id
    name: string;
    email: string;
    bookingCount: number;
    bookings: Booking[];
    lastBooking: string;
    preferredService: string;
    totalSpent: number; // Simulated
}

export default function AdminCustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();

            // Fetch bookings and registered user profiles in parallel
            const [bookingsResult, adminUsersResult] = await Promise.allSettled([
                supabase
                    .from("bookings")
                    .select("*")
                    .order("appointment_date", { ascending: false }),
                fetch(`${API_BASE}/api/admin/users`, {
                    headers: jsonAuthHeaders(session?.access_token),
                })
            ]);

            const bookings: Booking[] = bookingsResult.status === "fulfilled"
                ? (bookingsResult.value.data || [])
                : [];

            // Parse registered user profiles (unmasked — backend uses service-role key)
            interface AdminUser {
                id: string;
                name: string;
                email: string;
                created_at: string;
                bookingCount: number;
                lastBooking: string | null;
                totalSpent: number;
            }
            let adminUsers: AdminUser[] = [];
            if (adminUsersResult.status === "fulfilled" && (adminUsersResult.value as Response).ok) {
                try {
                    adminUsers = await (adminUsersResult.value as Response).json();
                } catch { adminUsers = []; }
            }

            const customerMap = new Map<string, Customer>();

            // First: populate from registered user_profiles (real email, no bookings yet OK)
            adminUsers.forEach((user: AdminUser) => {
                customerMap.set(user.id, {
                    id: user.id,
                    name: user.name,
                    email: user.email, // real unmasked email
                    bookingCount: 0,
                    bookings: [],
                    lastBooking: user.lastBooking || user.created_at,
                    preferredService: "None",
                    totalSpent: 0,
                });
            });

            // Second: merge booking data (also adds walk-in customers not in user_profiles)
            bookings.forEach((booking) => {
                const key = booking.user_id || `name:${booking.customer_name}`;

                if (!customerMap.has(key)) {
                    // Walk-in customer not in user_profiles
                    customerMap.set(key, {
                        id: booking.user_id || `name:${booking.customer_name}`,
                        name: booking.customer_name || "Unknown",
                        email: booking.user_email || "Walk-in / Not registered",
                        bookingCount: 0,
                        bookings: [],
                        lastBooking: booking.appointment_date,
                        preferredService: "None",
                        totalSpent: 0,
                    });
                }

                const customer = customerMap.get(key)!;
                customer.bookings.push(booking);
                customer.bookingCount += 1;

                if (new Date(booking.appointment_date) > new Date(customer.lastBooking)) {
                    customer.lastBooking = booking.appointment_date;
                }

                const priceMatch = booking.service?.match(/Rs\.\s*(\d+)/);
                if (priceMatch) {
                    customer.totalSpent += parseInt(priceMatch[1]);
                }
            });

            // Determine preferred service
            customerMap.forEach((customer) => {
                if (customer.bookings.length === 0) return;
                const serviceCounts = new Map<string, number>();
                customer.bookings.forEach(b => {
                    serviceCounts.set(b.service, (serviceCounts.get(b.service) || 0) + 1);
                });
                let maxCount = 0;
                let preferred = "None";
                serviceCounts.forEach((count, service) => {
                    if (count > maxCount) { maxCount = count; preferred = service; }
                });
                customer.preferredService = preferred;
            });

            setCustomers(Array.from(customerMap.values()));
        } catch (err: unknown) {
            console.error("Error fetching customers:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCustomer = async (customer: Customer) => {
        if (!window.confirm(`Delete BOOKINGS ONLY for ${customer.name}? (This only removes their booking records, not the account.)`)) {
            return;
        }

        setActionLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const bookingIds = customer.bookings.map(b => b.id);

            const response = await fetch(`${API_BASE}/api/delete-bookings`, {
                method: "POST",
                headers: jsonAuthHeaders(session?.access_token),
                body: JSON.stringify({
                    ids: bookingIds,
                    accessToken: session?.access_token
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Backend deletion failed");
            }

            setCustomers(customers.filter(c => c.id !== customer.id));
            if (selectedCustomer?.id === customer.id) {
                setSelectedCustomer(null);
            }
            alert(`Booking records for ${customer.name} have been cleared.`);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            alert("Failed to delete bookings: " + errorMessage);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteAccount = async (customer: Customer) => {
        // Only works for users with a real user_id (registered via Supabase Auth)
        const userId = customer.id;
        const isAuthUser = userId && !userId.startsWith("name:");
        if (!isAuthUser) {
            alert("This customer does not have a registered account. Only their booking records can be deleted.");
            return;
        }
        if (!window.confirm(`⚠️ PERMANENTLY DELETE the entire account for "${customer.name}"?\n\nThis will delete:\n• Their Supabase Auth account\n• All their bookings\n• Their profile record\n\nThis cannot be undone.`)) {
            return;
        }

        setActionLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${API_BASE}/api/users/${userId}`, {
                method: "DELETE",
                headers: jsonAuthHeaders(session?.access_token),
                body: JSON.stringify({ adminToken: session?.access_token })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Account deletion failed");
            }

            setCustomers(customers.filter(c => c.id !== customer.id));
            if (selectedCustomer?.id === customer.id) {
                setSelectedCustomer(null);
            }
            alert(`Account for ${customer.name} has been permanently deleted.`);
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            alert("Failed to delete account: " + errorMessage);
        } finally {
            setActionLoading(false);
        }
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Admin</p>
                    <h1 className="mt-2 text-2xl font-semibold text-stone-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-stone-700" />
                        Customers
                    </h1>
                    <p className="mt-1 text-sm text-stone-500">View customer records and booking history.</p>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full rounded-lg border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-stone-400"
                    />
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                <section className="rounded-lg border border-stone-200 bg-white">
                    <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
                        <h2 className="text-sm font-semibold text-stone-700">Customer list</h2>
                        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">
                            {filteredCustomers.length}
                        </span>
                    </div>

                    <div className="max-h-[65vh] overflow-y-auto">
                        {loading ? (
                            <div className="p-6 text-sm text-stone-500">Loading customers...</div>
                        ) : filteredCustomers.length === 0 ? (
                            <div className="p-6 text-sm text-stone-500">No customers found.</div>
                        ) : (
                            <div>
                                {filteredCustomers.map((customer) => {
                                    const isSelected = selectedCustomer?.id === customer.id;
                                    return (
                                        <button
                                            key={customer.id}
                                            onClick={() => setSelectedCustomer(customer)}
                                            className={`flex w-full items-center gap-3 border-b border-stone-100 px-4 py-3 text-left transition hover:bg-stone-50 ${isSelected ? "bg-stone-50" : "bg-white"}`}
                                        >
                                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-stone-100 text-sm font-semibold text-stone-700">
                                                {customer.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-sm font-medium text-stone-800">{customer.name}</div>
                                                <div className="truncate text-xs text-stone-500">{customer.email}</div>
                                            </div>
                                            <div className="text-right text-xs text-stone-500">
                                                <div>{customer.bookingCount}</div>
                                                <div>visits</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </section>

                <section className="space-y-4">
                    {selectedCustomer ? (
                        <>
                            <div className="rounded-lg border border-stone-200 bg-white p-4">
                                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-stone-200 bg-stone-100 text-lg font-semibold text-stone-700">
                                                {selectedCustomer.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-semibold text-stone-900">{selectedCustomer.name}</h2>
                                                <p className="text-sm text-stone-500">Customer profile</p>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-2 text-sm text-stone-600">
                                            <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-stone-400" /> {selectedCustomer.email}</p>
                                            <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-stone-400" /> Last booking: {new Date(selectedCustomer.lastBooking).toLocaleDateString()}</p>
                                            <p className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-stone-400" /> Preferred service: {selectedCustomer.preferredService}</p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <button
                                            onClick={() => handleDeleteCustomer(selectedCustomer)}
                                            disabled={actionLoading}
                                            className="inline-flex items-center gap-2 rounded-lg border border-orange-200 bg-white px-3 py-2 text-xs text-orange-600 transition hover:bg-orange-50 disabled:opacity-50"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Delete Bookings
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAccount(selectedCustomer)}
                                            disabled={actionLoading}
                                            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs text-red-600 transition hover:bg-red-50 disabled:opacity-50 font-semibold"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Delete Account
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-lg border border-stone-200 p-3">
                                        <div className="text-xs text-stone-500">Visits</div>
                                        <div className="mt-1 text-lg font-semibold text-stone-900">{selectedCustomer.bookingCount}</div>
                                    </div>
                                    <div className="rounded-lg border border-stone-200 p-3">
                                        <div className="text-xs text-stone-500">Category</div>
                                        <div className="mt-1 text-lg font-semibold text-stone-900">{selectedCustomer.bookingCount > 5 ? "Elite" : selectedCustomer.bookingCount > 2 ? "Regular" : "New"}</div>
                                    </div>
                                    <div className="rounded-lg border border-stone-200 p-3">
                                        <div className="text-xs text-stone-500">Estimated spend</div>
                                        <div className="mt-1 text-lg font-semibold text-stone-900">Rs. {selectedCustomer.totalSpent.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border border-stone-200 bg-white">
                                <div className="border-b border-stone-200 px-4 py-3">
                                    <h3 className="text-sm font-semibold text-stone-700">Booking history</h3>
                                </div>

                                <div className="divide-y divide-stone-100">
                                    {selectedCustomer.bookings.map((booking) => (
                                        <div key={booking.id} className="flex flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-stone-800">{booking.service}</div>
                                                <div className="text-xs text-stone-500">
                                                    {new Date(booking.appointment_date).toLocaleDateString()} at {new Date(booking.appointment_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                </div>
                                            </div>

                                            <div className="text-xs text-stone-500">
                                                Ref {String(booking.id || "").slice(0, 8).toUpperCase()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="rounded-lg border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
                            Select a customer to view details.
                        </div>
                    )}
                </section>
            </div>

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #CBD5E1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #64748B;
        }
      `}</style>
        </div>
    );
}
