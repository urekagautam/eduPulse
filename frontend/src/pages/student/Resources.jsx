import { useState, useMemo, useEffect, useRef } from "react";
import { ArrowLeft, X } from "lucide-react";
import Button from "../../components/Button";
import { ResourceCard } from "../../components/resources/ResourceDisplay";
import { getResources } from "../../services/apiResource";
import { fetchFaculties } from "../../services/apiFaculty";

function getLevelLabel(structureType, level) {
  const SEM = [
    "First",
    "Second",
    "Third",
    "Fourth",
    "Fifth",
    "Sixth",
    "Seventh",
    "Eighth",
  ];
  const YR = ["First", "Second", "Third", "Fourth", "Fifth"];
  const names = structureType === "semester" ? SEM : YR;
  return (
    (names[level - 1] || `Level ${level}`) +
    (structureType === "semester" ? " Semester" : " Year")
  );
}

const copyResourceForBookmark = (resource) => ({
  ...resource,
  images: (resource.images || []).map((image) => ({ ...image })),
});

export default function Resources() {
  const [facultyId, setFacultyId] = useState("");
  const [level, setLevel] = useState("");
  const [setSubjectId] = useState("");
  const [faculties, setFaculties] = useState([]);
  const [resources, setResources] = useState([]);
  const [showAllResources, setShowAllResources] = useState(false);
  const [cardsPerRow, setCardsPerRow] = useState(4);
  const [viewingResource, setViewingResource] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("student_bookmarks") || "[]");
    } catch {
      return [];
    }
  });
  const resourceGridRef = useRef(null);

  useEffect(() => {
    const loadPageData = async () => {
      try {
        const [facultyResult, resourceResult] = await Promise.all([
          fetchFaculties(),
          getResources(),
        ]);
        setFaculties(facultyResult.data || []);
        setResources(resourceResult || []);
        // Refresh older bookmark snapshots with the complete resource returned
        // by the API, including Cloudinary image URLs.
        setBookmarks((previousBookmarks) => {
          const refreshedBookmarks = previousBookmarks.map((bookmark) => {
            const currentResource = resourceResult?.find(
              (resource) => resource._id === bookmark._id,
            );
            return currentResource
              ? copyResourceForBookmark(currentResource)
              : bookmark;
          });
          localStorage.setItem(
            "student_bookmarks",
            JSON.stringify(refreshedBookmarks),
          );
          return refreshedBookmarks;
        });
      } catch (error) {
        console.error("Failed to load resources:", error);
      }
    };

    loadPageData();
  }, []);

  const faculty = useMemo(
    () => faculties.find((f) => f._id === facultyId),
    [faculties, facultyId],
  );
  const levelOptions = useMemo(() => {
    if (!faculty) return [];
    return Array.from({ length: faculty.maxLevel }, (_, i) => ({
      value: i + 1,
      label: getLevelLabel(faculty.structureType, i + 1),
    }));
  }, [faculty]);

  const filtered = resources.filter(
    (r) =>
      (!facultyId || r.facultyId === facultyId) &&
      (!level || r.level === Number(level)),
  );

  useEffect(() => {
    const grid = resourceGridRef.current;
    if (!grid) return undefined;

    const updateCardsPerRow = () => {
      const columns = getComputedStyle(grid).gridTemplateColumns
        .split(" ")
        .filter(Boolean).length;
      setCardsPerRow(Math.max(columns, 1));
    };

    const animationFrame = requestAnimationFrame(updateCardsPerRow);
    const observer = new ResizeObserver(updateCardsPerRow);
    observer.observe(grid);
    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [filtered.length, viewingResource]);

  const hasAdditionalResourceRows = filtered.length > cardsPerRow;
  const displayedResources = showAllResources
    ? filtered
    : filtered.slice(0, cardsPerRow);

  const toggleBookmark = (res) => {
    const exists = bookmarks.find((b) => b._id === res._id);
    const next = exists
      ? bookmarks.filter((b) => b._id !== res._id)
      : [copyResourceForBookmark(res), ...bookmarks];
    setBookmarks(next);
    localStorage.setItem("student_bookmarks", JSON.stringify(next));
  };

  const isBookmarked = (resource) =>
    bookmarks.find((bookmark) => bookmark._id === resource._id);
  const imageUrl = (image) =>
    image?.secure_url || image?.url || image?.imageUrl || image?.imagePath || image?.path || "";
  const resourceTitle = (resource) =>
    resource.title ||
    (resource.type === "images"
      ? resource.images?.[0]?.title || "Untitled image resource"
      : "(untitled)");
  const resourceSubject = (resource) =>
    resource.subjectName ||
    resource.subject?.subject_name ||
    resource.subject?.name ||
    resource.subjectId?.subject_name ||
    resource.subjectId?.name ||
    resource.subjectId?.subject_code ||
    (typeof resource.subjectId === "string" ? resource.subjectId : "");

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Resources</h1>
        <p className="text-gray-600 mt-1">
          Select Faculty, Semester and Subject to view resources posted by
          teachers. Bookmark resources to save them.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Faculty
          </label>
          <select
            value={facultyId}
            onChange={(e) => {
              setFacultyId(e.target.value);
              setLevel("");
              setSubjectId("");
            }}
            className="w-full px-4 py-3 border rounded"
          >
            <option value="">Select faculty</option>
            {faculties.map((f) => (
              <option key={f._id} value={f._id}>
                {f.code} — {f.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Semester/Year
          </label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full px-4 py-3 border rounded"
            disabled={!faculty}
          >
            <option value="">Select</option>
            {levelOptions.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!viewingResource && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">Available Resources</h3>
            {showAllResources && hasAdditionalResourceRows && (
              <button
                type="button"
                onClick={() => setShowAllResources(false)}
                className="text-[var(--color-primary)]"
              >
                Back
              </button>
            )}
          </div>
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-600">
              No resources found for selection.
            </div>
          ) : (
            <>
              <div
                ref={resourceGridRef}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4"
              >
                {displayedResources.map((resource) => (
                  <ResourceCard
                    key={resource._id}
                    resource={resource}
                    onView={setViewingResource}
                    action={
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleBookmark(resource);
                        }}
                        className={`px-3 py-1 rounded text-sm ${isBookmarked(resource) ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-700"}`}
                      >
                        {isBookmarked(resource) ? "Saved" : "Save"}
                      </button>
                    }
                  />
                ))}
              </div>
              {hasAdditionalResourceRows && !showAllResources && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setShowAllResources(true)}
                    className="text-[var(--color-primary)]"
                  >
                    View All
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {viewingResource && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="inline-flex items-center justify-center p-2"
                onClick={() => {
                  setViewingResource(null);
                  setSelectedImage(null);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-xl font-bold">
                  {resourceTitle(viewingResource)}
                </h2>
                <p className="text-xs text-gray-500">
                  {new Date(viewingResource.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleBookmark(viewingResource)}
              className={`px-3 py-1 rounded text-sm ${isBookmarked(viewingResource) ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-700"}`}
            >
              {isBookmarked(viewingResource) ? "Saved" : "Save"}
            </button>
          </div>

          {resourceSubject(viewingResource) && (
            <p className="text-sm text-gray-600">
              Subject: {resourceSubject(viewingResource)}
            </p>
          )}

          {viewingResource.description && (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: viewingResource.description }}
            />
          )}

          {viewingResource.images?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Images</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-3">
                {viewingResource.images.map((image) => (
                  <div
                    key={image.public_id || imageUrl(image)}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-3"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedImage(image)}
                      className="group block h-64 overflow-hidden rounded-xl bg-white"
                    >
                      <img
                        src={imageUrl(image)}
                        alt={image.title || "Resource image"}
                        className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                      />
                    </button>
                    <p className="mt-3 font-medium text-gray-900">
                      {image.title || "Untitled image"}
                    </p>
                    {image.caption && (
                      <p className="mt-1 text-sm text-gray-600">
                        {image.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-lg font-semibold">Bookmarked</h3>
        {bookmarks.length === 0 ? (
          <p className="text-gray-600 mt-2">No saved resources.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 mt-3">
            {bookmarks.map((resource) => (
              <ResourceCard
                key={resource._id}
                resource={resource}
                onView={setViewingResource}
                action={
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleBookmark(resource);
                    }}
                    className={`px-3 py-1 rounded text-sm ${isBookmarked(resource) ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-700"}`}
                  >
                    {isBookmarked(resource) ? "Saved" : "Save"}
                  </button>
                }
              />
            ))}
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-4xl">
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-white/90 p-2 text-gray-700 shadow-sm hover:bg-white"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl bg-white shadow-xl">
              <img
                src={imageUrl(selectedImage)}
                alt={selectedImage.title || "Resource image"}
                className="mx-auto block h-auto w-auto max-h-[calc(100vh-8rem)] max-w-full object-contain"
              />
              <div className="p-4">
                <p className="text-lg font-semibold text-gray-900">
                  {selectedImage.title || "Image"}
                </p>
                {selectedImage.caption && (
                  <p className="mt-2 text-sm text-gray-600">
                    {selectedImage.caption}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
