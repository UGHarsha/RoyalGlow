"use client";

import { useState, useEffect } from "react";
import { supabase } from "../../../utils/supabase";
import { API_BASE, jsonAuthHeaders } from "../../../utils/api";
import {
  Calendar,
  Trash2,
  Edit2,
  X,
  Search,
  Save,
  Clock,
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

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Filters
  const [filterType, setFilterType] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  // Statuses
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Booking>>({});
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchBookings();
    const storedStatuses = localStorage.getItem("adminBookingStatuses");
    if (storedStatuses) {
      try {
        setStatuses(JSON.parse(storedStatuses));
      } catch (e) {
        console.error("Failed to parse statuses", e);
      }
    }
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("bookings")
        .select("*")
        .order("appointment_date", { ascending: false });

      if (fetchError) throw fetchError;
      setBookings(data || []);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (booking: Booking) => {
    setEditingId(booking.id);
    setEditFormData({
      customer_name: booking.customer_name,
      service: booking.service,
      appointment_date: booking.appointment_date,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async (id: string) => {
    setActionLoading(true);
    try {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          customer_name: editFormData.customer_name,
          service: editFormData.service,
          appointment_date: editFormData.appointment_date,
        })
        .eq("id", id);

      if (updateError) throw updateError;

      setBookings(
        bookings.map((b) => (b.id === id ? { ...b, ...editFormData } : b))
      );
      setEditingId(null);
      setEditFormData({});
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert("Failed to update booking: " + errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this appointment? This action cannot be undone."
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch(
        `${API_BASE}/api/delete-bookings`,
        {
          method: "POST",
          headers: jsonAuthHeaders(session?.access_token),
          body: JSON.stringify({
            ids: [id],
            accessToken: session?.access_token,
          }),
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Delete failed");
      }

      setBookings(bookings.filter((b) => b.id !== id));

      const updatedStatuses = { ...statuses };
      delete updatedStatuses[id];
      setStatuses(updatedStatuses);
      localStorage.setItem(
        "adminBookingStatuses",
        JSON.stringify(updatedStatuses)
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert("Failed to delete booking: " + errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    const updatedStatuses = { ...statuses, [id]: newStatus };
    setStatuses(updatedStatuses);
    localStorage.setItem(
      "adminBookingStatuses",
      JSON.stringify(updatedStatuses)
    );
  };

  const getBookingStatus = (id: string, appointmentDate: string) => {
    if (statuses[id]) return statuses[id];
    const appDate = new Date(appointmentDate);
    const today = new Date();
    if (appDate < today && appDate.toDateString() !== today.toDateString()) {
      return "Completed";
    }
    return "Pending";
  };

  const filteredBookings = bookings.filter((b) => {
    if (
      searchTerm &&
      !b.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !b.service?.toLowerCase().includes(searchTerm.toLowerCase())
    )
      return false;

    const appDate = new Date(b.appointment_date);
    const today = new Date();
    const isToday = appDate.toDateString() === today.toDateString();
    const isUpcoming = appDate > today;

    if (filterType === "today" && !isToday) return false;
    if (filterType === "upcoming" && !isUpcoming) return false;

    if (dateFilter) {
      const filterDateStr = new Date(dateFilter).toDateString();
      if (appDate.toDateString() !== filterDateStr) return false;
    }

    const status = getBookingStatus(b.id, b.appointment_date);
    if (statusFilter !== "all" && status !== statusFilter) return false;

    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Confirmed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Cancelled":
        return "bg-red-50 text-red-600 border-red-200";
      case "Completed":
        return "bg-stone-100 text-stone-600 border-stone-200";
      case "Pending":
      default:
        return "bg-amber-50 text-amber-700 border-amber-200";
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-800 flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-stone-700" />
            Bookings
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            Manage all appointments and update statuses.
          </p>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-300" />
          <input
            type="text"
            placeholder="Search name or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 w-full py-2 bg-white border border-stone-200 rounded-lg text-sm focus:border-stone-400 focus:ring-1 focus:ring-stone-200 transition outline-none"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-stone-200/60 p-3 flex flex-wrap gap-3 items-center">
        {/* Type filters */}
        <div className="flex bg-stone-100 rounded-lg p-0.5">
          {["all", "today", "upcoming"].map((lbl) => (
            <button
              key={lbl}
              onClick={() => setFilterType(lbl)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md capitalize transition ${filterType === lbl
                ? "bg-white shadow-sm text-stone-800"
                : "text-stone-500 hover:text-stone-700"
                }`}
            >
              {lbl}
            </button>
          ))}
        </div>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-1.5 pl-3 pr-7 bg-stone-100 border-none rounded-lg text-xs text-stone-600 font-medium focus:ring-1 focus:ring-stone-300 outline-none cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        {/* Date */}
        <div className="relative ml-auto">
          <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-stone-100 border-none rounded-lg text-xs text-stone-600 font-medium focus:ring-1 focus:ring-stone-300 outline-none cursor-pointer"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter("")}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-stone-200/60 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-stone-400 mx-auto" />
            <p className="text-stone-400 mt-3 text-xs">
              Loading appointments...
            </p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-red-500 px-6 text-sm">
            Error: {error}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="py-16 text-center">
            <Calendar className="w-10 h-10 text-stone-200 mx-auto mb-3" />
            <p className="text-stone-500 text-sm">No matching appointments.</p>
            <button
              onClick={() => {
                setFilterType("all");
                setStatusFilter("all");
                setDateFilter("");
                setSearchTerm("");
              }}
              className="mt-3 text-xs text-emerald-700 hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-100 text-[11px] font-semibold tracking-wider text-stone-400 uppercase">
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {filteredBookings.map((booking) => {
                  const currentStatus = getBookingStatus(
                    booking.id,
                    booking.appointment_date
                  );

                  return (
                    <tr
                      key={booking.id}
                      className="hover:bg-stone-50/50 transition"
                    >
                      <td className="px-5 py-3.5">
                        {editingId === booking.id ? (
                          <input
                            type="text"
                            value={editFormData.customer_name || ""}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                customer_name: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-stone-500"
                          />
                        ) : (
                          <span className="text-sm font-medium text-stone-700">
                            {booking.customer_name || "Unknown"}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        {editingId === booking.id ? (
                          <input
                            type="text"
                            value={editFormData.service || ""}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                service: e.target.value,
                              })
                            }
                            className="w-full px-2.5 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-stone-500"
                          />
                        ) : (
                          <span className="text-xs font-medium text-stone-500 bg-stone-50 px-2.5 py-1 rounded-full border border-stone-100 inline-block max-w-45 truncate">
                            {booking.service || "Not specified"}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        {editingId === booking.id ? (
                          <input
                            type="datetime-local"
                            value={
                              editFormData.appointment_date
                                ? new Date(editFormData.appointment_date)
                                  .toISOString()
                                  .slice(0, 16)
                                : ""
                            }
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                appointment_date: new Date(
                                  e.target.value
                                ).toISOString(),
                              })
                            }
                            className="px-2.5 py-1.5 border border-stone-300 rounded-lg text-sm focus:outline-none focus:border-stone-500"
                          />
                        ) : (
                          <div>
                            <div className="text-sm text-stone-700">
                              {new Date(
                                booking.appointment_date
                              ).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </div>
                            <div className="text-[11px] text-stone-400 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(
                                booking.appointment_date
                              ).toLocaleString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <select
                          value={currentStatus}
                          onChange={(e) =>
                            handleStatusChange(booking.id, e.target.value)
                          }
                          className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border cursor-pointer appearance-none ${getStatusColor(
                            currentStatus
                          )}`}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Confirmed">Confirmed</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {editingId === booking.id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(booking.id)}
                                disabled={actionLoading}
                                className="p-1.5 text-emerald-600 bg-emerald-50 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition"
                                title="Save"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                disabled={actionLoading}
                                className="p-1.5 text-stone-500 bg-stone-50 rounded-lg border border-stone-200 hover:bg-stone-100 transition"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEditClick(booking)}
                                disabled={actionLoading}
                                className="p-1.5 text-stone-600 bg-stone-50 rounded-lg border border-stone-200 hover:bg-stone-100 transition"
                                title="Edit"
                                suppressHydrationWarning
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(booking.id)}
                                disabled={actionLoading}
                                className="p-1.5 text-red-500 bg-red-50 rounded-lg border border-red-100 hover:bg-red-100 transition"
                                title="Delete"
                                suppressHydrationWarning
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}