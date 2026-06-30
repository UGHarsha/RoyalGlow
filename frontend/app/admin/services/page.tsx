"use client";

import { useState, useEffect, FormEvent } from "react";
import { API_BASE, jsonAuthHeaders, getAccessToken, parseApiError } from "../../../utils/api";
import {
    Plus,
    Edit2,
    Trash2,
    X,
    Scissors,
    Clock,
    Check,
    ChevronRight,
} from "lucide-react";

interface Service {
    id: string;
    name: string;
    category: string;
    price: string;
    duration: number;
    description?: string;
}

export default function AdminServices() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("All");

    // New service form
    const [showAddForm, setShowAddForm] = useState(false);
    const [newService, setNewService] = useState({
        name: "",
        category: "Men - Hair",
        price: "",
        duration: 30 as number | string,
        description: "",
    });

    // Editing
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Service | null>(null);

    const fetchServices = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/services");
            if (!response.ok) throw new Error("Failed to fetch services");
            const data = await response.json();
            setServices(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const handleAddService = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const accessToken = await getAccessToken();
            if (!accessToken) {
                alert("Session expired. Please log in again.");
                return;
            }
            const response = await fetch(`${API_BASE}/api/services`, {
                method: "POST",
                headers: jsonAuthHeaders(accessToken),
                body: JSON.stringify({
                    ...newService,
                    accessToken,
                }),
            });
            if (!response.ok) throw new Error(await parseApiError(response));
            setShowAddForm(false);
            setNewService({
                name: "",
                category: "Men - Hair",
                price: "",
                duration: 30,
                description: "",
            });
            fetchServices();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to add service");
        }
    };

    const handleUpdateService = async (e: FormEvent) => {
        e.preventDefault();
        if (!editForm) return;
        try {
            const accessToken = await getAccessToken();
            if (!accessToken) {
                alert("Session expired. Please log in again.");
                return;
            }
            const response = await fetch(
                `${API_BASE}/api/services/${editForm.id}`,
                {
                    method: "PUT",
                    headers: jsonAuthHeaders(accessToken),
                    body: JSON.stringify({
                        ...editForm,
                        accessToken,
                    }),
                }
            );
            if (!response.ok) throw new Error(await parseApiError(response));
            setEditingId(null);
            setEditForm(null);
            fetchServices();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to update service");
        }
    };

    const handleDeleteService = async (id: string) => {
        if (!confirm("Are you sure you want to delete this service?")) return;
        try {
            const accessToken = await getAccessToken();
            if (!accessToken) {
                alert("Session expired. Please log in again.");
                return;
            }
            const response = await fetch(
                `${API_BASE}/api/services/${id}`,
                {
                    method: "DELETE",
                    headers: jsonAuthHeaders(accessToken),
                    body: JSON.stringify({ accessToken }),
                }
            );
            if (!response.ok) throw new Error(await parseApiError(response));
            fetchServices();
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to delete service");
        }
    };

    const startEditing = (service: Service) => {
        setEditingId(service.id);
        setEditForm({ ...service });
    };

    const filteredServices = services.filter((s) => {
        if (activeTab === "All") return true;
        return s.category.startsWith(activeTab);
    });

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-stone-800 flex items-center gap-2.5">
                        <Scissors className="w-6 h-6 text-stone-700" />
                        Services
                    </h1>
                    <p className="text-stone-400 text-sm mt-1">
                        Manage your service menu and pricing.
                    </p>
                </div>
                <button
                    onClick={() => setShowAddForm(true)}
                    className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-emerald-700 transition shadow-sm hover:shadow-md"
                >
                    <Plus className="w-4 h-4" />
                    Add Service
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Tabs */}
            <div className="flex bg-white rounded-lg p-0.5 border border-stone-200/60 w-fit">
                {["All", "Men", "Women"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2 rounded-md text-xs font-semibold transition ${activeTab === tab
                                ? "bg-stone-800 text-white shadow-sm"
                                : "text-stone-500 hover:text-stone-700 hover:bg-stone-50"
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Services Grid */}
            {loading ? (
                <div className="py-20 text-center">
                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-stone-400 mx-auto" />
                    <p className="text-stone-400 mt-3 text-xs">Loading services...</p>
                </div>
            ) : filteredServices.length === 0 ? (
                <div className="bg-white rounded-xl border border-stone-200/60 p-16 text-center">
                    <Scissors className="w-10 h-10 text-stone-200 mx-auto mb-3" />
                    <p className="text-stone-500 text-sm">No services in this category.</p>
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="mt-3 text-xs text-emerald-700 hover:underline font-medium"
                    >
                        Add your first service
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredServices.map((service) => (
                        <div
                            key={service.id}
                            className="group bg-white rounded-xl border border-stone-200 p-5 hover:shadow-sm hover:border-stone-300 transition-all duration-200 flex flex-col"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <span
                                    className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold border ${service.category.startsWith("Men")
                                            ? "bg-blue-50 text-blue-600 border-blue-100"
                                            : "bg-pink-50 text-pink-600 border-pink-100"
                                        }`}
                                >
                                    {service.category}
                                </span>
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => startEditing(service)}
                                        className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-50 rounded-lg transition"
                                        title="Edit"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteService(service.id)}
                                        className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-base font-semibold text-stone-800 mb-1 leading-tight">
                                {service.name}
                            </h3>
                            <p className="text-xs text-stone-400 leading-relaxed mb-4 flex-1 line-clamp-2">
                                {service.description || "No description provided."}
                            </p>

                            <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                                <span className="text-sm font-bold text-stone-700">
                                    Rs. {service.price}
                                </span>
                                <span className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-[11px] font-medium text-stone-500">
                                    {service.duration} min
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editingId && editForm && (
                <div className="fixed inset-0 z-60 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4 py-6">
                    <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-stone-200">
                        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
                            <div>
                                <h3 className="text-lg font-semibold text-stone-900">Edit service</h3>
                                <p className="text-sm text-stone-500">Make changes in a larger form.</p>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingId(null);
                                    setEditForm(null);
                                }}
                                className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateService} className="p-5 space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Service Name
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-stone-200 focus:border-stone-400 outline-none transition"
                                        value={editForm.name}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, name: e.target.value })
                                        }
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Category
                                    </label>
                                    <select
                                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-stone-200 focus:border-stone-400 outline-none transition"
                                        value={editForm.category}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, category: e.target.value })
                                        }
                                    >
                                        <optgroup label="Men">
                                            <option value="Men - Face">Men - Face</option>
                                            <option value="Men - Hair">Men - Hair</option>
                                            <option value="Men - Bridal Full">Men - Bridal Full</option>
                                        </optgroup>
                                        <optgroup label="Women">
                                            <option value="Women - Face">Women - Face</option>
                                            <option value="Women - Hair">Women - Hair</option>
                                            <option value="Women - Nails">Women - Nails</option>
                                            <option value="Women - Bridal Full">Women - Bridal Full</option>
                                        </optgroup>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Duration (min)
                                    </label>
                                    <input
                                        type="number"
                                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-stone-200 focus:border-stone-400 outline-none transition"
                                        value={editForm.duration || ""}
                                        onChange={(e) =>
                                            setEditForm({
                                                ...editForm,
                                                duration:
                                                    e.target.value === ""
                                                        ? ("" as unknown as number)
                                                        : parseInt(e.target.value),
                                            })
                                        }
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Price
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-stone-200 focus:border-stone-400 outline-none transition"
                                        value={editForm.price}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, price: e.target.value })
                                        }
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Description
                                    </label>
                                    <textarea
                                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-stone-200 focus:border-stone-400 outline-none transition min-h-32 resize-y"
                                        value={editForm.description || ""}
                                        onChange={(e) =>
                                            setEditForm({
                                                ...editForm,
                                                description: e.target.value,
                                            })
                                        }
                                        placeholder="Describe the service..."
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingId(null);
                                        setEditForm(null);
                                    }}
                                    className="rounded-lg bg-stone-100 px-4 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
                                >
                                    Save changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Service Slide-over */}
            {showAddForm && (
                <div className="fixed inset-0 z-60 bg-black/20 backdrop-blur-sm flex justify-end">
                    <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-fadeIn">
                        <div className="p-5 border-b border-stone-100 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-stone-800">
                                New Service
                            </h3>
                            <button
                                onClick={() => setShowAddForm(false)}
                                className="p-1.5 text-stone-400 hover:bg-stone-100 rounded-lg transition"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto">
                            <form onSubmit={handleAddService} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Service Name
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-stone-200 focus:border-stone-400 outline-none transition"
                                        value={newService.name}
                                        onChange={(e) =>
                                            setNewService({ ...newService, name: e.target.value })
                                        }
                                        placeholder="e.g. Royal Balayage"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Category
                                    </label>
                                    <div className="relative">
                                        <select
                                            className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm appearance-none focus:ring-2 focus:ring-stone-200 focus:border-stone-400 outline-none transition"
                                            value={newService.category}
                                            onChange={(e) =>
                                                setNewService({
                                                    ...newService,
                                                    category: e.target.value,
                                                })
                                            }
                                        >
                                            <optgroup label="Men">
                                                <option value="Men - Face">Men - Face</option>
                                                <option value="Men - Hair">Men - Hair</option>
                                                <option value="Men - Bridal Full">
                                                    Men - Bridal Full
                                                </option>
                                            </optgroup>
                                            <optgroup label="Women">
                                                <option value="Women - Face">Women - Face</option>
                                                <option value="Women - Hair">Women - Hair</option>
                                                <option value="Women - Nails">Women - Nails</option>
                                                <option value="Women - Bridal Full">
                                                    Women - Bridal Full
                                                </option>
                                            </optgroup>
                                        </select>
                                        <ChevronRight className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 rotate-90 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                            Price (Rs.)
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-stone-200 focus:border-stone-400 outline-none transition"
                                            value={newService.price}
                                            onChange={(e) =>
                                                setNewService({
                                                    ...newService,
                                                    price: e.target.value,
                                                })
                                            }
                                            placeholder="5000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                            Duration (min)
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-stone-200 focus:border-stone-400 outline-none transition"
                                            value={newService.duration || ""}
                                            onChange={(e) =>
                                                setNewService({
                                                    ...newService,
                                                    duration:
                                                        e.target.value === ""
                                                            ? ("" as unknown as number)
                                                            : parseInt(e.target.value),
                                                })
                                            }
                                            placeholder="45"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                                        Description
                                    </label>
                                    <textarea
                                        className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-stone-200 focus:border-stone-400 outline-none transition min-h-25 resize-y"
                                        value={newService.description || ""}
                                        onChange={(e) =>
                                            setNewService({
                                                ...newService,
                                                description: e.target.value,
                                            })
                                        }
                                        placeholder="Describe the service..."
                                    />
                                </div>
                            </form>
                        </div>

                        <div className="p-5 border-t border-stone-100">
                            <button
                                onClick={handleAddService}
                                className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors"
                            >
                                Add Service
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
