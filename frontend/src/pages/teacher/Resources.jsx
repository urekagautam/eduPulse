import { useRef, useState, useMemo, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit2, Search, X, ArrowLeft } from "lucide-react";
import Button from "../../components/Button";
import ImageUploadField from "../../components/ImageUploadField";
import { ResourceCard } from "../../components/resources/ResourceDisplay";
import { uploadResourceImages } from "../../utils/resourceImageUpload";
import {
  getResources,
  getTeacherResourceAssignments,
  createResource,
  updateResource,
  deleteResource,
} from "../../services/apiResource";

const selectClass =
  "w-full px-4 py-3 border border-gray-300 rounded-2xl bg-white text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const inputClass =
  "w-full px-4 py-3 border border-gray-300 rounded-2xl text-[var(--input-text)] placeholder:text-[var(--input-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";
const labelClass = "block text-sm font-semibold text-gray-700 mb-2";

const SEMESTER_NAMES = [
  "First",
  "Second",
  "Third",
  "Fourth",
  "Fifth",
  "Sixth",
  "Seventh",
  "Eighth",
];
const YEAR_NAMES = ["First", "Second", "Third", "Fourth", "Fifth"];

function getLevelLabel(structureType, level) {
  const names = structureType === "semester" ? SEMESTER_NAMES : YEAR_NAMES;
  const name = names[level - 1] || `Level ${level}`;
  return structureType === "semester" ? `${name} Semester` : `${name} Year`;
}

function stripHtml(html = "") {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ");
}

export default function Resources() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [assignedSubjects, setAssignedSubjects] = useState([]);

  const [resources, setResources] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [resourceType, setResourceType] = useState("text");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState(""); // HTML
  const [images, setImages] = useState([]); // { id, public_id, file, url, previewUrl, title, caption }
  const [viewingResource, setViewingResource] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [currentImageFile, setCurrentImageFile] = useState(null);
  const [currentImagePreview, setCurrentImagePreview] = useState(null);
  const [imageUploadError, setImageUploadError] = useState(null);
  const [currentImageTitle, setCurrentImageTitle] = useState("");
  const [currentImageCaption, setCurrentImageCaption] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [textFormatting, setTextFormatting] = useState({
    isBold: false,
    isUnderline: false,
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const descriptionRef = useRef(null);

  const faculties = useMemo(() => {
    const seen = new Set();
    return assignedSubjects
      .filter((assignment) => {
        if (seen.has(assignment.facultyId)) return false;
        seen.add(assignment.facultyId);
        return true;
      })
      .map((assignment) => ({ ...assignment, code: assignment.facultyCode }));
  }, [assignedSubjects]);

  const faculty = faculties.find((item) => item.facultyId === selectedFacultyId);

  const levelOptions = useMemo(() => {
    const levels = assignedSubjects
      .filter((assignment) => assignment.facultyId === selectedFacultyId)
      .map((assignment) => assignment.level);
    return [...new Set(levels)]
      .sort((a, b) => a - b)
      .map((value) => ({
        value,
        label: getLevelLabel(faculty?.structureType, value),
      }));
  }, [assignedSubjects, faculty?.structureType, selectedFacultyId]);

  const subjectOptions = useMemo(
    () =>
      assignedSubjects.filter(
        (assignment) =>
          assignment.facultyId === selectedFacultyId &&
          assignment.level === Number(selectedLevel),
      ),
    [assignedSubjects, selectedFacultyId, selectedLevel],
  );

  const isBlobUrl = (url) => typeof url === "string" && url.startsWith("blob:");

  const revokeBlobUrl = (url) => {
    if (isBlobUrl(url)) {
      URL.revokeObjectURL(url);
    }
  };

  const logDebug = (label, value) => {
    if (import.meta.env.DEV) {
      console.debug(`[Resources] ${label}:`, value);
    }
  };

  const normalizeResources = useCallback((list) => {
    return (list || []).map((resource) => ({
      ...resource,
      images: (resource.images || []).map((im) => {
        const url = im.secure_url || im.url || "";
        if (isBlobUrl(url)) {
          logDebug("Dropping blob URL from fetched resource image", {
            id: im.id,
            url,
          });
        }
        return {
          ...im,
          id: im.public_id || im.id || im.secure_url || im.url,
          public_id: im.public_id,
          file: null,
          previewUrl: undefined,
          secure_url: im.secure_url || (isBlobUrl(im.url) ? undefined : im.url),
          url: im.secure_url || (isBlobUrl(im.url) ? "" : im.url) || "",
          title: im.title || "",
          caption: im.caption || "",
        };
      }),
    }));
  }, []);

  const resetForm = () => {
    setResourceType("text");
    setTitle("");
    setDescription("");
    setImages([]);
    setEditingId(null);
    setTextFormatting({ isBold: false, isUnderline: false });
    setCurrentImageTitle("");
    setCurrentImageCaption("");
    setImageUploadError(null);
    setUploadProgress(0);
    clearImageSelection();
  };

  const fetchResources = async () => {
    try {
      const data = await getResources();
      setResources(normalizeResources(data));
    } catch (err) {
      console.error("Failed to load resources:", err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadResources = async () => {
      try {
        const [data, assignments] = await Promise.all([
          getResources(),
          getTeacherResourceAssignments(),
        ]);
        logDebug("Fetched resources", data);
        if (isMounted) {
          setResources(normalizeResources(data));
          setAssignedSubjects(assignments || []);
        }
      } catch (err) {
        console.error("Failed to load resources:", err);
      }
    };

    loadResources();
    return () => {
      isMounted = false;
    };
  }, [normalizeResources]);

  const clearImageSelection = () => {
    if (currentImagePreview) URL.revokeObjectURL(currentImagePreview);
    setCurrentImageFile(null);
    setCurrentImagePreview(null);
    setImageUploadError(null);
  };

  const handleImageFileSelect = (file, errorMessage) => {
    if (currentImagePreview) URL.revokeObjectURL(currentImagePreview);
    if (!file) {
      setCurrentImageFile(null);
      setCurrentImagePreview(null);
      setImageUploadError(errorMessage);
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    logDebug("Selected file preview URL", previewUrl);
    setCurrentImageFile(file);
    setCurrentImagePreview(previewUrl);
    setImageUploadError(null);
  };

  const handleAddCurrentImage = () => {
    if (!currentImageFile) {
      setImageUploadError("Please select an image");
      return;
    }
    if (!currentImageTitle.trim()) {
      setImageUploadError("Please enter a title for this image");
      return;
    }
    const previewUrl = currentImagePreview;
    logDebug("Adding image with preview URL", previewUrl);
    setImages((prev) => [
      ...prev,
      {
        id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        file: currentImageFile,
        previewUrl,
        url: "",
        title: currentImageTitle,
        caption: currentImageCaption,
      },
    ]);
    setCurrentImageFile(null);
    setCurrentImagePreview(null);
    setImageUploadError(null);
  };

  const closeEditor = () => {
    setShowAddModal(false);
    setSelectedFacultyId("");
    setSelectedLevel("");
    setSelectedSubjectId("");
    resetForm();
  };

  const openEditorForNew = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleStartCreate = () => {
    if (!selectedFacultyId || !selectedLevel || !selectedSubjectId) return;
    setShowAddModal(false);
    // editor is visible because faculty+level remain selected
    resetForm();
  };

  const updateTextFormattingState = () => {
    setTextFormatting({
      isBold: document.queryCommandState("bold"),
      isUnderline: document.queryCommandState("underline"),
    });
  };

  const applyFormatting = (type) => {
    const el = descriptionRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(type);
    updateTextFormattingState();
  };

  const handleRemoveImage = (id) => {
    setImages((prev) => {
      const removed = prev.find((i) => i.id === id);
      if (removed) {
        revokeBlobUrl(removed.url);
        revokeBlobUrl(removed.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleSave = async () => {
    if (!selectedFacultyId || !selectedLevel || !selectedSubjectId) return;
    if (
      resourceType === "text" &&
      (!title.trim() || !stripHtml(description).trim())
    ) {
      setImageUploadError("Text resources require both a title and description");
      return;
    }

    let imageMetadata = [];
    try {
      if (resourceType === "images") {
        if (images.length === 0) {
          setImageUploadError("Please add at least one image");
          return;
        }

        const invalidBlob = images.some(
          (img) =>
            !img.public_id &&
            !img.file &&
            !img.url &&
            isBlobUrl(img.previewUrl),
        );
        if (invalidBlob) {
          setImageUploadError(
            "Please re-select any images that are still showing a preview URL before saving.",
          );
          return;
        }

        const newFiles = images.filter((img) => img.file);
        let savedImages = images;

        if (newFiles.length > 0) {
          setIsUploading(true);
          setUploadProgress(0);
          logDebug(
            "Uploading files",
            newFiles.map((img) => img.file.name),
          );
          const uploaded = await uploadResourceImages(
            newFiles.map((img) => img.file),
            setUploadProgress,
          );
          logDebug("Cloudinary upload result", uploaded);
          let uploadIndex = 0;
          const blobUrlsToRevoke = [];
          savedImages = images.map((img) => {
            if (!img.file) return { ...img, previewUrl: undefined };
            blobUrlsToRevoke.push(img.previewUrl || img.url);
            const uploadResult = uploaded[uploadIndex++] || {};
            return {
              ...img,
              id: uploadResult.public_id || img.id,
              public_id: uploadResult.public_id,
              url: uploadResult.secure_url,
              previewUrl: undefined,
              file: null,
            };
          });
          blobUrlsToRevoke.forEach(revokeBlobUrl);
          setImages(savedImages);
          logDebug("Saved images after upload", savedImages);
        }

        imageMetadata = savedImages.map((img) => ({
          public_id: img.public_id,
          secure_url: img.url,
          title: img.title,
          caption: img.caption,
        }));
        const blobsLeft = savedImages.filter(
          (img) => isBlobUrl(img.url) || isBlobUrl(img.previewUrl),
        );
        if (blobsLeft.length > 0) {
          logDebug("Blob URLs still present after upload", blobsLeft);
          savedImages = savedImages.map((img) => ({
            ...img,
            previewUrl: undefined,
          }));
          setImages(savedImages);
        }
      }

      const payload = {
        facultyId: selectedFacultyId,
        level: Number(selectedLevel),
        subjectId: selectedSubjectId,
        type: resourceType,
        title: resourceType === "text" ? title.trim() : "",
        description: resourceType === "text" ? description : "",
        imageMetadata,
      };

      if (editingId) {
        await updateResource(editingId, payload);
      } else {
        await createResource(payload);
      }
      await fetchResources();
      closeEditor();
    } catch (err) {
      console.error("Failed to save resource:", err);
      setImageUploadError(
        err.response?.data?.message || err.message || "Unable to save resource",
      );
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = (res) => {
    setViewingResource(null);
    setSelectedFacultyId(res.facultyId);
    setSelectedLevel(String(res.level));
    setSelectedSubjectId(res.subjectId?._id || res.subjectId || "");
    setEditingId(res._id);
    setResourceType(res.type);
    setTitle(res.title || "");
    setDescription(res.description || "");
    setImages(
      (res.images || []).map((im, index) => ({
        id:
          im.public_id ||
          im.id ||
          `img_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
        public_id: im.public_id,
        file: null,
        url: im.secure_url || im.url,
        previewUrl: undefined,
        title: im.title || "",
        caption: im.caption || "",
      })),
    );
    setTextFormatting({ isBold: false, isUnderline: false });
    // ensure contentEditable shows the HTML
    setTimeout(() => {
      if (descriptionRef.current) {
        descriptionRef.current.innerHTML = res.description || "";
        updateTextFormattingState();
      }
    }, 50);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this resource?")) return;

    try {
      await deleteResource(id);
      setResources((prev) => prev.filter((r) => r._id !== id));
      setViewingResource((v) => (v?._id === id ? null : v));
    } catch (err) {
      console.error("Failed to delete resource:", err);
    }
  };

  const sortedResources = useMemo(() => {
    return resources.slice().sort((a, b) => {
      const aTitle = (a.title || "").toLowerCase();
      const bTitle = (b.title || "").toLowerCase();
      return aTitle.localeCompare(bTitle);
    });
  }, [resources]);

  const filtered = useMemo(() => {
    return sortedResources.filter((r) => {
      if (searchQuery && !r.title) return false;
      return (
        r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        !searchQuery
      );
    });
  }, [sortedResources, searchQuery]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Resources</h1>
        <p className="mt-1 text-gray-600">
          Upload notes and important questions for your students.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full max-w-lg">
          <label className="sr-only">Search</label>
          <div className="relative flex-1">
            <input
              placeholder="Search by title…"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 pl-10 focus:outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          </div>
        </div>

        <div>
          <Button
            className="inline-flex items-center gap-2"
            onClick={openEditorForNew}
            variant="primary"
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {/* Modal: choose from this teacher's assigned subjects */}
      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-lg">
            <h3 className="text-lg font-bold">Choose faculty, level & subject</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className={labelClass}>Faculty</label>
                <select
                  className={selectClass}
                  value={selectedFacultyId}
                  onChange={(e) => {
                    setSelectedFacultyId(e.target.value);
                    setSelectedLevel("");
                    setSelectedSubjectId("");
                  }}
                >
                  <option value="">Select faculty</option>
                  {faculties.map((f) => (
                    <option key={f.facultyId} value={f.facultyId}>
                      {f.facultyCode} — {f.facultyName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Semester / Year</label>
                <select
                  className={selectClass}
                  value={selectedLevel}
                  onChange={(e) => {
                    setSelectedLevel(e.target.value);
                    setSelectedSubjectId("");
                  }}
                  disabled={!selectedFacultyId}
                >
                  <option value="">Select level</option>
                  {levelOptions.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Subject</label>
                <select
                  className={selectClass}
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  disabled={!selectedLevel}
                >
                  <option value="">Select subject</option>
                  {subjectOptions.map((subject) => (
                    <option key={subject.subjectId} value={subject.subjectId}>
                      {subject.subjectCode
                        ? `${subject.subjectCode} — ${subject.subjectName}`
                        : subject.subjectName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={closeEditor}>
                Cancel
              </Button>
              <Button onClick={handleStartCreate} variant="primary">
                Proceed
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Editor area (shown after an assigned subject is selected) */}
      {selectedFacultyId && selectedLevel && selectedSubjectId && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                Faculty: <strong>{faculty?.code}</strong> ·{" "}
                {getLevelLabel(faculty?.structureType, Number(selectedLevel))}
              </p>
              <p className="text-sm text-gray-500">
                Subject:{" "}
                <strong>
                  {
                    subjectOptions.find(
                      (subject) => subject.subjectId === selectedSubjectId,
                    )?.subjectName
                  }
                </strong>
              </p>
              <p className="text-xs text-gray-400">
                Create a text note or upload multiple images with titles and
                captions.
              </p>
            </div>
            {editingId && <p className="text-sm text-gray-500">Editing</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setResourceType("text")}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold ${resourceType === "text" ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  Text resource
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResourceType("images");
                    setTitle("");
                    setDescription("");
                    if (descriptionRef.current) descriptionRef.current.innerHTML = "";
                  }}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold ${resourceType === "images" ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  Image(s)
                </button>
              </div>
              {resourceType === "text" && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className={labelClass}>Title</label>
                    <input
                      className={inputClass}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Description</label>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyFormatting("bold")}
                        className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-colors ${
                          textFormatting.isBold
                            ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => applyFormatting("underline")}
                        className={`px-4 py-2 rounded-2xl underline text-sm font-semibold transition-colors ${
                          textFormatting.isUnderline
                            ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        U
                      </button>
                    </div>
                    <div
                      ref={descriptionRef}
                      contentEditable
                      suppressContentEditableWarning
                      dir="ltr"
                      className="w-full rounded-2xl border border-gray-300 px-4 py-3 min-h-30 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] whitespace-pre-wrap wrap-break-word text-left"
                      style={{ textAlign: "left" }}
                      onInput={(e) => setDescription(e.currentTarget.innerHTML)}
                      onKeyUp={updateTextFormattingState}
                      onMouseUp={updateTextFormattingState}
                    />
                  </div>
                </div>
              )}

              {resourceType === "images" && (
                <div className="mt-4 space-y-4">
                  <ImageUploadField
                    label="Resource image"
                    file={currentImageFile}
                    previewUrl={currentImagePreview}
                    onFileSelect={handleImageFileSelect}
                    onClear={clearImageSelection}
                    error={imageUploadError}
                  />

                    {/* Image Title */}
                    <div>
                      <label className={labelClass}>
                      Image Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className={inputClass}
                      value={currentImageTitle}
                      onChange={(e) => setCurrentImageTitle(e.target.value)}
                      placeholder="Enter a title for all uploaded images"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      This title and caption will be applied to each image you
                      add until you change them.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <div className="space-y-4">
                      <div>
                        <label className={labelClass}>
                          Image Caption (Optional)
                        </label>
                        <input
                          type="text"
                          className={inputClass}
                          value={currentImageCaption}
                          onChange={(e) =>
                            setCurrentImageCaption(e.target.value)
                          }
                          placeholder="Enter a caption for all uploaded images"
                        />
                      </div>
                    </div>

                    <div className="flex items-end justify-between gap-4">
                      <p className="text-sm text-gray-500">
                        Add the selected file with its title and optional
                        caption.
                      </p>
                      <button
                        type="button"
                        onClick={handleAddCurrentImage}
                        className="rounded-2xl bg-[var(--color-primary)] text-[var(--color-primary-foreground)] px-4 py-2 text-sm font-semibold hover:bg-[var(--color-primary-strong)]"
                        disabled={isUploading}
                      >
                        Add Image
                      </button>
                    </div>
                  </div>

                  {isUploading && (
                    <div className="rounded-2xl bg-[var(--color-primary-bg)] p-3 text-sm text-[var(--color-primary)]">
                      Uploading images... {uploadProgress}%
                    </div>
                  )}

                  {/* Images Grid */}
                  {images.length > 0 && (
                    <div className="mt-6">
                      <h4 className="mb-4 text-sm font-semibold text-gray-700">
                        Added Images ({images.length})
                      </h4>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                        {images.map((img) => (
                          <div
                            key={
                              img.id ||
                              img.public_id ||
                              img.url ||
                              img.previewUrl
                            }
                            className="rounded-lg border border-gray-200 p-3 shadow-sm"
                          >
                            <div className="h-40 overflow-hidden rounded-md bg-gray-50 flex items-center justify-center">
                              {img.url || img.previewUrl ? (
                                <img
                                  src={img.url || img.previewUrl}
                                  alt={img.title || "Resource image"}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="text-sm text-gray-500">
                                  No image
                                </div>
                              )}
                            </div>
                            <p className="mt-3 font-medium text-gray-900 truncate">
                              {img.title}
                            </p>
                            {img.caption && (
                              <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                                {img.caption}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(img.id)}
                              className="mt-3 w-full rounded bg-red-50 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm">
                <p className="font-semibold">Preview</p>
                <p className="mt-2 text-xs text-gray-600">
                  Resources will appear as cards to students. You can edit or
                  delete after saving.
                </p>
                <div className="mt-3">
                  <p className="text-sm font-medium">Title</p>
                  <p className="text-sm text-gray-700 truncate">
                    {title || "(no title)"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={closeEditor}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={resetForm}>
              Reset
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isUploading}
            >
              {isUploading ? "Saving..." : editingId ? "Update" : "Publish"}
            </Button>
          </div>
        </div>
      )}

      {/* Resource cards grid or single resource view */}
      {!viewingResource && (
        <div>
          <h3 className="mb-4 text-lg font-bold">All resources</h3>
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-gray-200 bg-white py-12 text-center text-gray-600">
              No resources yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
              {filtered.map((r) => (
                <ResourceCard
                  key={r._id}
                  resource={r}
                  onView={setViewingResource}
                  action={
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(r);
                        }}
                        className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-strong)]"
                      >
                        <Edit2 />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(r._id);
                        }}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
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
                  {viewingResource.title || "Resource"}
                </h2>
                <p className="text-xs text-gray-500">
                  {new Date(viewingResource.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEdit(viewingResource)}
                className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-strong)]"
              >
                <Edit2 />
              </button>
              <button
                onClick={() => handleDelete(viewingResource._id)}
                className="text-sm text-red-600"
              >
                <Trash2 />
              </button>
            </div>
          </div>

          {viewingResource.description && (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: viewingResource.description }}
            />
          )}

          {viewingResource.images && viewingResource.images.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Images</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-3">
                {viewingResource.images.map((img) => (
                  <div
                    key={img.public_id || img.id || img.url}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-3"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedImage(img)}
                      className="group block h-64 overflow-hidden rounded-xl bg-white"
                    >
                      <img
                        src={img.url}
                        alt={img.title || img.name}
                        className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                      />
                    </button>
                    <p className="mt-3 font-medium text-gray-900">
                      {img.title || "Untitled image"}
                    </p>
                    {img.caption && (
                      <p className="mt-1 text-sm text-gray-600">
                        {img.caption}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
                src={selectedImage.url}
                alt={selectedImage.title || selectedImage.name}
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
