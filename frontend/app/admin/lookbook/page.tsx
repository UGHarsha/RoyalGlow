"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { API_BASE, jsonAuthHeaders, getAccessToken, parseApiError } from "../../../utils/api";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";

interface LookBookImage {
  id: string;
  src: string;
  alt: string;
}

export default function AdminLookbook() {
  const [images, setImages] = useState<LookBookImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newImage, setNewImage] = useState({ src: "", alt: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/lookbook");
      if (!response.ok) throw new Error("Failed to fetch images");
      const data = await response.json();
      setImages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleAddImage = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setUploading(true);
      const accessToken = await getAccessToken();
      if (!accessToken) {
        alert("Session expired. Please log in again.");
        return;
      }

      let finalSrc = newImage.src;

      if (selectedFile) {
        const formData = new FormData();
        formData.append("image", selectedFile);
        formData.append("accessToken", accessToken);

        const uploadResponse = await fetch(`${API_BASE}/api/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        });

        if (!uploadResponse.ok) throw new Error(await parseApiError(uploadResponse));
        const uploadData = await uploadResponse.json();
        finalSrc = uploadData.url;
      }

      const response = await fetch(`${API_BASE}/api/lookbook`, {
        method: "POST",
        headers: jsonAuthHeaders(accessToken),
        body: JSON.stringify({
          src: finalSrc,
          alt: newImage.alt,
          accessToken,
        }),
      });

      if (!response.ok) throw new Error(await parseApiError(response));

      setShowAddForm(false);
      setNewImage({ src: "", alt: "" });
      setSelectedFile(null);
      fetchImages();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add image");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        alert("Session expired. Please log in again.");
        return;
      }

      const response = await fetch(`${API_BASE}/api/lookbook/${id}`, {
        method: "DELETE",
        headers: jsonAuthHeaders(accessToken),
        body: JSON.stringify({ accessToken }),
      });

      if (!response.ok) throw new Error(await parseApiError(response));
      fetchImages();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete image");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Admin</p>
          <h1 className="mt-2 text-2xl font-semibold text-stone-900 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-stone-700" />
            Lookbook
          </h1>
          <p className="mt-1 text-sm text-stone-500">Upload and manage salon photos.</p>
        </div>

        <button
          onClick={() => setShowAddForm((value) => !value)}
          className="inline-flex items-center gap-2 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800"
        >
          <Plus className="h-4 w-4" />
          {showAddForm ? "Close form" : "Add photo"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleAddImage} className="rounded-xl border border-stone-200 bg-white p-4 md:p-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Upload file</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                    setNewImage({ ...newImage, src: file.name });
                  }
                }}
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-stone-400"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Image URL</label>
              <input
                type="text"
                required={!selectedFile}
                disabled={!!selectedFile}
                value={newImage.src}
                onChange={(e) => setNewImage({ ...newImage, src: e.target.value })}
                placeholder="https://..."
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-stone-400 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Caption</label>
              <input
                type="text"
                required
                value={newImage.alt}
                onChange={(e) => setNewImage({ ...newImage, alt: e.target.value })}
                placeholder="Short description for the image"
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-stone-400"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={uploading}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {uploading ? "Uploading..." : "Save photo"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-stone-800">Photo grid</h2>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-stone-500">Loading gallery...</div>
        ) : images.length === 0 ? (
          <div className="py-16 text-center text-sm text-stone-500">No photos added yet.</div>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img) => (
              <div key={img.id} className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                <div className="relative aspect-4/5">
                  <Image src={img.src} alt={img.alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                </div>
                <div className="flex items-start justify-between gap-3 p-3">
                  <p className="min-w-0 flex-1 text-sm text-stone-700">{img.alt}</p>
                  <button
                    onClick={() => handleDeleteImage(img.id)}
                    className="rounded-lg border border-red-200 px-2.5 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50"
                  >
                    <span className="inline-flex items-center gap-1">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}