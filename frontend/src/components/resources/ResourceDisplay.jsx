import { ArrowLeft, X } from "lucide-react";
import Button from "../Button";

const getResourceImageUrl = (image) =>
  image?.secure_url || image?.url || image?.imageUrl || image?.imagePath || image?.path || "";

const getResourceTitle = (resource) =>
  resource.title ||
  (resource.type === "images"
    ? resource.images?.[0]?.title || "Untitled image resource"
    : "(untitled)");

export function ResourceCard({
  resource,
  onView,
  action,
}) {
  return (
    <div
      onClick={() => onView(resource)}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-gray-900 truncate">
            {getResourceTitle(resource)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {new Date(resource.createdAt).toLocaleDateString()}
          </p>
        </div>
        {action}
      </div>
      {resource.images?.length > 0 && (
        <div className="mb-3 overflow-hidden rounded-xl bg-gray-50">
          <img
            src={getResourceImageUrl(resource.images[0])}
            alt={resource.images[0].title || resource.images[0].name || "Resource image"}
            className="h-40 w-full object-cover"
          />
        </div>
      )}
      {resource.description && (
        <div
          className="mt-3 text-sm text-gray-700 line-clamp-3"
          dangerouslySetInnerHTML={{ __html: resource.description }}
        />
      )}
    </div>
  );
}

export function ResourceViewer({ resource, onBack, onImageSelect, action }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="inline-flex items-center justify-center p-2"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">{getResourceTitle(resource)}</h2>
            <p className="text-xs text-gray-500">
              {new Date(resource.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        {action}
      </div>
      {(resource.subjectName || resource.subject?.name || resource.subject?.subject_name || resource.subject || resource.subjectId) && (
        <p className="text-sm text-gray-600">
          Subject: {resource.subjectName || resource.subject?.name || resource.subject?.subject_name || resource.subject || resource.subjectId}
        </p>
      )}
      {resource.description && (
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: resource.description }} />
      )}
      {resource.images?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Images</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-3">
            {resource.images.map((image) => (
              <div key={image.public_id || image.id || getResourceImageUrl(image)} className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <button type="button" onClick={() => onImageSelect(image)} className="group block h-64 overflow-hidden rounded-xl bg-white">
                  <img src={getResourceImageUrl(image)} alt={image.title || image.name || "Resource image"} className="h-full w-full object-cover transition duration-200 group-hover:scale-105" />
                </button>
                <p className="mt-3 font-medium text-gray-900">{image.title || "Untitled image"}</p>
                {image.caption && <p className="mt-1 text-sm text-gray-600">{image.caption}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ResourceImageLightbox({ image, onClose }) {
  if (!image) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-4xl">
        <button type="button" onClick={onClose} className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-gray-700 shadow-sm hover:bg-white">
          <X className="h-5 w-5" />
        </button>
        <div className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl bg-white shadow-xl">
          <img src={getResourceImageUrl(image)} alt={image.title || image.name || "Resource image"} className="mx-auto block h-auto w-auto max-h-[calc(100vh-8rem)] max-w-full object-contain" />
          <div className="p-4">
            <p className="text-lg font-semibold text-gray-900">{image.title || "Image"}</p>
            {image.caption && <p className="mt-2 text-sm text-gray-600">{image.caption}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
