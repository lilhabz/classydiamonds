// 📄 components/admin/CustomPhotosPanel.tsx
// 🖼 Custom Photos panel for the unified Admin page.
// NOTE: No visual overhaul; same upload/delete UX.

"use client";

import { useEffect, useRef, useState } from "react";

type CustomPhoto = {
  _id: string;
  imageUrl: string;
  createdAt: string;
};

export default function CustomPhotosPanel() {
  const [photos, setPhotos] = useState<CustomPhoto[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState({ loading: false, error: "", success: "" });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPhotos();
  }, []);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [imageFile]);

  const loadPhotos = async () => {
    try {
      const res = await fetch("/api/custom-photos");
      const data = await res.json();
      setPhotos(data.photos || []);
    } catch {
      setStatus({ loading: false, error: "Failed to load photos.", success: "" });
    }
  };

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus({ loading: false, error: "Please choose an image file.", success: "" });
      return;
    }
    setStatus({ loading: false, error: "", success: "" });
    setImageFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileChange(e.target.files?.[0] || null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileChange(file);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    if (e.type === "dragleave") setDragActive(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return;
    setStatus({ loading: true, error: "", success: "" });
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      const res = await fetch("/api/admin/custom-photos", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      setPhotos((p) => [data.photo, ...p]);
      setImageFile(null);
      setStatus({ loading: false, error: "", success: "Photo added" });
    } catch (err: any) {
      setStatus({ loading: false, error: err.message, success: "" });
    }
  };

  const deletePhoto = async (id: string) => {
    const ok = confirm("Delete this photo?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/custom-photos?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setPhotos((p) => p.filter((x) => x._id !== id));
    } catch (err: any) {
      alert("❌ " + err.message);
    }
  };

  return (
    <div>
      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="mb-8 space-y-4" aria-label="Upload custom photo">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
        />

        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`rounded-2xl border-2 ${
            dragActive ? "border-blue-400 bg-blue-400/10" : "border-[#364763]"
          } p-6 flex flex-col items-center justify-center gap-3 bg-[var(--bg-nav)]`}
          role="region"
          aria-label="Drag and drop image upload area"
        >
          <button
            type="button"
            onClick={onPickFile}
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow"
          >
            ⬆️ Upload Photo
          </button>
          <p className="text-sm text-gray-300">or drag & drop an image here</p>

          {imageFile && (
            <div className="mt-3 text-xs text-gray-300">
              Selected: <span className="font-medium">{imageFile.name}</span>
            </div>
          )}

          {previewUrl && (
            <div className="mt-4 w-40 h-40 rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Preview of selected image" className="object-cover w-full h-full" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={status.loading || !imageFile}
            className="bg-green-600 disabled:opacity-50 text-white rounded-xl py-2 px-5 hover:bg-green-700 transition"
          >
            {status.loading ? "Saving..." : "Add Photo"}
          </button>
          {imageFile && (
            <button
              type="button"
              onClick={() => setImageFile(null)}
              className="px-4 py-2 rounded-xl bg-[var(--bg-nav)] border border-[#364763] hover:bg-[#364763] transition"
            >
              Clear Selection
            </button>
          )}
        </div>

        {status.error && <p className="text-red-500">❌ {status.error}</p>}
        {status.success && <p className="text-green-500">✅ {status.success}</p>}
      </form>

      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {photos.map((p) => (
          <div
            key={p._id}
            className="relative w-full h-40 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.imageUrl} alt="Custom creation" className="object-cover w-full h-full" />
            <button
              onClick={() => deletePhoto(p._id)}
              className="absolute top-2 right-2 px-2 py-1 text-xs rounded-lg bg-red-600/90 hover:bg-red-700 text-white shadow opacity-0 group-hover:opacity-100 transition"
              title="Delete photo"
              aria-label="Delete photo"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
