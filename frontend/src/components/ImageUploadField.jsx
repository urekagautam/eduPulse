import { useRef } from "react";
import { Upload, X, ImageIcon } from "lucide-react";
import {
  NOTICE_IMAGE_MAX_FILE_SIZE,
  NOTICE_IMAGE_MAX_FILE_SIZE_TEXT,
} from "../constants/uploads";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function ImageUploadField({
  file,
  previewUrl,
  onFileSelect,
  onClear,
  error,
  label = "Notice image",
}) {
  const inputRef = useRef(null);

  const openPicker = () => inputRef.current?.click();

  const handleFile = (selected) => {
    if (!selected) return;
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      onFileSelect(null, "Please upload a JPG, PNG, WebP, or GIF image.");
      return;
    }
    if (selected.size > NOTICE_IMAGE_MAX_FILE_SIZE) {
      onFileSelect(
        null,
        `Please upload an image smaller than ${NOTICE_IMAGE_MAX_FILE_SIZE_TEXT}.`,
      );
      return;
    }
    onFileSelect(selected, null);
  };

  const handleChange = (e) => {
    const selected = e.target.files?.[0];
    handleFile(selected);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    handleFile(dropped);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700">
        {label} <span className="text-red-500">*</span>
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={handleChange}
      />

      {!previewUrl ? (
        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(e) => e.key === "Enter" && openPicker()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-6 py-10 cursor-pointer transition-colors hover:border-[var(--color-primary-border)] hover:bg-[var(--color-primary-bg)]"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary-bg)] text-[var(--color-primary)]">
            <Upload className="h-7 w-7" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">
              Click to upload or drag and drop
            </p>
            <p className="mt-1 text-xs text-gray-500">
              JPG, PNG, WebP or GIF • Up to {NOTICE_IMAGE_MAX_FILE_SIZE_TEXT}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
            <img
              src={previewUrl}
              alt={
                file?.name
                  ? `Preview: ${file.name}`
                  : `Selected ${label.toLowerCase()}`
              }
              className="max-h-72 w-full object-contain"
            />
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 top-3 rounded-full bg-white/90 p-1.5 text-gray-600 shadow-sm transition-colors hover:bg-white hover:text-red-600"
              aria-label="Remove image"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {file && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ImageIcon className="h-4 w-4 shrink-0" />
              <span className="truncate font-medium">{file.name}</span>
              <span className="shrink-0 text-gray-400">
                ({(file.size / 1024).toFixed(1)} KB)
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={openPicker}
            className="text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-strong)]"
          >
            Choose a different image
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <p className="text-xs text-gray-500">
        Preview shows the selected file. After publishing, the notice will use
        the chosen image.
      </p>
    </div>
  );
}
