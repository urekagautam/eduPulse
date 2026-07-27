import { useState, useEffect, useRef } from "react";
import { Calendar, X, Edit2, Trash2 } from "lucide-react";
import Button from "../../components/Button";
import ImageUploadField from "../../components/ImageUploadField";
import { uploadNoticeImage } from "../../utils/noticeImageUpload";
import {
  getNotices,
  createNotice,
  deleteNotice,
  updateNotice,
} from "../../services/apiNotice";

export default function Notices() {
  const [showAddNotice, setShowAddNotice] = useState(false);
  const [noticeType, setNoticeType] = useState("text"); // "text" or "image"
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    caption: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUploadError, setImageUploadError] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [notices, setNotices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayCount, setDisplayCount] = useState(3); // Start with 3 notices
  const [selectedDateRange, setSelectedDateRange] = useState({
    from: "",
    to: "",
  });

  const [expandedNotices, setExpandedNotices] = useState({}); // Track expanded descriptions
  const [deleteConfirmId, setDeleteConfirmId] = useState(null); // Track which notice is being deleted
  const [editingNotice, setEditingNotice] = useState(null); // Track notice being edited
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const prevShowAddRef = useRef(false);

  const fetchNotices = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getNotices();

      const transformedNotices = data.map((notice) => ({
        _id: notice._id,
        type: notice.notice_image ? "image" : "text",
        title: notice.title || "",
        description: notice.description || "",
        caption: notice.image_caption || "",
        imagePath: notice.notice_image || "",
        fontStyleTitle: notice.font_style_title || notice.font_style || {},
        fontStyleDescription:
          notice.font_style_description || notice.font_style || {},
        createdAt: new Date(notice.createdAt).toISOString().split("T")[0],
      }));

      setNotices(transformedNotices);
    } catch (err) {
      console.error("Failed to fetch notices:", err);
      setError("Failed to load notices");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      await fetchNotices();
    };
    load();
  }, []);

  // initialize contentEditable fields only when the modal opens (transition false->true)
  useEffect(() => {
    if (showAddNotice && !prevShowAddRef.current) {
      if (titleRef.current) titleRef.current.innerHTML = formData.title || "";
      if (descRef.current)
        descRef.current.innerHTML = formData.description || "";
    }
    prevShowAddRef.current = showAddNotice;
  }, [showAddNotice, formData.title, formData.description]);

  const clearImageSelection = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setImageUploadError(null);
  };

  const applyFormatting = (command) => {
    try {
      document.execCommand(command);
    } catch (e) {
      console.warn("Formatting command failed", e);
    }
  };

  const handleImageFileSelect = (file, errorMessage) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      setImageUploadError(errorMessage);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageUploadError(null);
  };

  const handleAddNotice = async () => {
    if (noticeType === "text") {
      const titleHtml = titleRef.current
        ? titleRef.current.innerHTML
        : formData.title;
      const descHtml = descRef.current
        ? descRef.current.innerHTML
        : formData.description;
      const titlePlain = titleRef.current
        ? titleRef.current.innerText.trim()
        : (formData.title || "").trim();
      const descPlain = descRef.current
        ? descRef.current.innerText.trim()
        : (formData.description || "").trim();
      if (!titlePlain && !descPlain) {
        setImageUploadError(
          "Please add a title or description for this notice.",
        );
        return;
      }
      setIsPublishing(true);
      try {
        const newNoticeData = {
          title: titleHtml,
          description: descHtml,
          isActive: true,
        };
        await createNotice(newNoticeData);
        await fetchNotices();
        resetForm();
      } catch (err) {
        console.error("Error creating notice:", err);
        setImageUploadError("Failed to create notice. Please try again.");
      } finally {
        setIsPublishing(false);
      }
      return;
    }

    if (noticeType === "image" && imageFile) {
      setIsPublishing(true);
      try {
        const { imagePath } = await uploadNoticeImage(imageFile);
        const newNoticeData = {
          notice_image: imagePath,
          image_caption: formData.caption,
          isActive: true,
        };
        await createNotice(newNoticeData);
        await fetchNotices();
        resetForm();
      } catch (err) {
        console.error("Error uploading notice:", err);
        setImageUploadError("Could not upload image. Please try again.");
      } finally {
        setIsPublishing(false);
      }
    } else if (noticeType === "image") {
      setImageUploadError("Please upload an image for this notice.");
    }
  };

  const resetForm = () => {
    clearImageSelection();
    setFormData({ title: "", description: "", caption: "" });
    setShowAddNotice(false);
    setEditingNotice(null);
  };

  const handleEditNotice = (notice) => {
    setEditingNotice(notice);
    setNoticeType(notice.type);
    if (notice.type === "text") {
      setFormData({
        title: notice.title,
        description: notice.description,
        caption: "",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        caption: notice.caption,
      });
      setImagePreview(notice.imagePath);
    }
    setShowAddNotice(true);
  };

  const handleUpdateNotice = async () => {
    if (!editingNotice) return;

    if (editingNotice.type === "text") {
      const titleHtml = titleRef.current
        ? titleRef.current.innerHTML
        : formData.title;
      const descHtml = descRef.current
        ? descRef.current.innerHTML
        : formData.description;
      const titlePlain = titleRef.current
        ? titleRef.current.innerText.trim()
        : (formData.title || "").trim();
      const descPlain = descRef.current
        ? descRef.current.innerText.trim()
        : (formData.description || "").trim();
      if (!titlePlain && !descPlain) {
        setImageUploadError(
          "Please add a title or description for this notice.",
        );
        return;
      }
      setIsPublishing(true);
      try {
        const updateData = {
          title: titleHtml,
          description: descHtml,
        };
        await updateNotice(editingNotice._id, updateData);
        await fetchNotices();
        resetForm();
      } catch (err) {
        console.error("Error updating notice:", err);
        setImageUploadError("Failed to update notice. Please try again.");
      } finally {
        setIsPublishing(false);
      }
    } else if (editingNotice.type === "image") {
      setIsPublishing(true);
      try {
        let imagePath = editingNotice.imagePath;
        if (imageFile) {
          const { imagePath: newPath } = await uploadNoticeImage(imageFile);
          imagePath = newPath;
        }
        const updateData = {
          notice_image: imagePath,
          image_caption: formData.caption,
        };
        await updateNotice(editingNotice._id, updateData);
        await fetchNotices();
        resetForm();
      } catch (err) {
        console.error("Error updating notice:", err);
        setImageUploadError("Failed to update notice. Please try again.");
      } finally {
        setIsPublishing(false);
      }
    }
  };

  const handleDeleteNotice = async (id) => {
    try {
      await deleteNotice(id);
      setNotices(notices.filter((notice) => notice._id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Error deleting notice:", err);
      setError("Failed to delete notice");
    }
  };

  const toggleExpandDescription = (id) => {
    setExpandedNotices((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const truncateText = (text, lines = 2) => {
    const lineArray = text.split("\n");
    if (lineArray.length > lines) {
      return lineArray.slice(0, lines).join("\n") + "...";
    }
    // For single paragraph, check approximate character count (roughly 80 chars per line)
    const charLimit = lines * 80;
    if (text.length > charLimit) {
      return text.substring(0, charLimit) + "...";
    }
    return text;
  };

  const getPlainText = (html) => {
    if (!html) return "";
    return html.replace(/<[^>]+>/g, "");
  };

  const canPublishImageNotice =
    noticeType === "image" &&
    (imageFile || (editingNotice && imagePreview)) &&
    !isPublishing;
  const canPublishTextNotice =
    noticeType === "text" && (formData.title || formData.description);

  const filteredNotices = notices.filter((notice) => {
    if (!selectedDateRange.from && !selectedDateRange.to) return true;
    const noticeDate = new Date(notice.createdAt);
    const fromDate = selectedDateRange.from
      ? new Date(selectedDateRange.from)
      : null;
    const toDate = selectedDateRange.to ? new Date(selectedDateRange.to) : null;

    if (fromDate && noticeDate < fromDate) return false;
    if (toDate && noticeDate > toDate) return false;
    return true;
  });

  const displayedNotices = filteredNotices.slice(0, displayCount);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notices</h1>
          <p className="text-gray-600 mt-1">
            Manage and view all academic notices
          </p>
        </div>
      </div>

      {/* Add Notice Modal */}
      {showAddNotice && (
        <div className="fixed inset-0 bg-black bg-black/30 flex items-center justify-center z-50 p-4 min-h-screen">
          <div
            className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-hide"
            style={{ scrollbarWidth: "none" }}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingNotice ? "Edit Notice" : "Add New Notice"}
              </h2>
              <button
                onClick={() => resetForm()}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Notice Type Selection */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="text"
                    checked={noticeType === "text"}
                    onChange={(e) => {
                      setNoticeType(e.target.value);
                      if (e.target.value === "text") clearImageSelection();
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700 font-medium">
                    Text Notice (Title & Description)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="image"
                    checked={noticeType === "image"}
                    onChange={(e) => setNoticeType(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-700 font-medium">
                    Image Notice (With Caption)
                  </span>
                </label>
              </div>

              {/* Text Notice Form */}
              {noticeType === "text" && (
                <div className="space-y-6">
                  {/* Text Formatting Toolbar */}
                  <div className="flex gap-2 border-b border-gray-200 pb-4">
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormatting("bold")}
                      className={`px-4 py-2 rounded font-bold transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200`}
                      title="Bold selected text"
                    >
                      B
                    </button>
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => applyFormatting("underline")}
                      className={`px-4 py-2 rounded underline transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200`}
                      title="Underline selected text"
                    >
                      U
                    </button>
                  </div>

                  {/* Title Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Notice Title
                    </label>
                    <div
                      ref={titleRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) =>
                        setFormData({
                          ...formData,
                          title: e.currentTarget.innerHTML,
                        })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  {/* Description Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Description
                    </label>
                    <div
                      ref={descRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) =>
                        setFormData({
                          ...formData,
                          description: e.currentTarget.innerHTML,
                        })
                      }
                      placeholder="Enter notice description... (Text will be justified)"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                      style={{ textAlign: "justify", minHeight: 120 }}
                    />
                  </div>
                </div>
              )}

              {/* Image Notice Form */}
              {noticeType === "image" && (
                <div className="space-y-6">
                  <ImageUploadField
                    file={imageFile}
                    previewUrl={imagePreview}
                    onFileSelect={handleImageFileSelect}
                    onClear={clearImageSelection}
                    error={imageUploadError}
                  />

                  {/* Caption Input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Caption (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.caption}
                      onChange={(e) =>
                        setFormData({ ...formData, caption: e.target.value })
                      }
                      placeholder="Enter caption for the image..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-4 justify-end border-t border-gray-200 p-6">
              <Button onClick={() => resetForm()} variant="secondary">
                Cancel
              </Button>
              <Button
                onClick={editingNotice ? handleUpdateNotice : handleAddNotice}
                variant="primary"
                disabled={!canPublishTextNotice && !canPublishImageNotice}
              >
                {isPublishing
                  ? editingNotice
                    ? "Updating..."
                    : "Publishing..."
                  : editingNotice
                    ? "Update Notice"
                    : "Publish Notice"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Notice History Section */}
      <div className="space-y-6">
        <div className="sticky top-0 bg-white z-10 py-4 flex justify-between items-center gap-4 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">Notice History</h2>
          <div className="flex gap-3 items-center">
            <Button
              onClick={() => setShowAddNotice(!showAddNotice)}
              variant="primary"
              size="sm"
            >
              + Add Notice
            </Button>
            {displayCount < filteredNotices.length ? (
              <Button
                onClick={() => setDisplayCount(displayCount + 3)}
                variant="outline"
                size="sm"
              >
                View All
              </Button>
            ) : (
              displayCount > 3 && (
                <Button
                  onClick={() => setDisplayCount(3)}
                  size="sm"
                  className="bg-gray-500/50 text-white hover:bg-gray-600/60 border-0"
                >
                  View Less
                </Button>
              )
            )}
          </div>
        </div>

        {/* Date Filter */}
        <div className="flex gap-4 flex-wrap items-center">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-600" />
            <input
              type="date"
              value={selectedDateRange.from}
              onChange={(e) =>
                setSelectedDateRange({
                  ...selectedDateRange,
                  from: e.target.value,
                })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <span className="text-gray-500 text-sm">—</span>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDateRange.to}
              onChange={(e) =>
                setSelectedDateRange({
                  ...selectedDateRange,
                  to: e.target.value,
                })
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          {(selectedDateRange.from || selectedDateRange.to) && (
            <Button
              onClick={() => setSelectedDateRange({ from: "", to: "" })}
              variant="secondary"
              size="sm"
            >
              Clear Filter
            </Button>
          )}
        </div>

        {/* Notices List */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
              <p className="text-gray-600 text-lg">Loading notices...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-white border border-red-200 rounded-lg">
              <p className="text-red-600 text-lg">{error}</p>
            </div>
          ) : displayedNotices.length > 0 ? (
            displayedNotices.map((notice) => {
              // Parse createdAt date properly
              let dateStr = notice.createdAt;
              if (typeof notice.createdAt === "string") {
                // If it's already a string like "2024-05-16", parse it
                dateStr = notice.createdAt.includes("T")
                  ? notice.createdAt.split("T")[0]
                  : notice.createdAt;
              }
              const noticeDate = new Date(dateStr + "T00:00:00");
              return (
                <div
                  key={notice._id}
                  className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Notice Header with Date and Action Buttons */}
                  <div className="flex justify-between items-start gap-4 mb-4 flex-wrap">
                    <span className="inline-block bg-[var(--color-primary-bg)] text-[var(--color-primary-strong)] px-3 py-1 rounded-full text-sm font-medium">
                      {noticeDate.toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditNotice(notice)}
                        className="p-2 text-gray-600 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-bg)] rounded-lg transition-colors"
                        title="Edit notice"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(notice._id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete notice"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Notice Content */}
                  {notice.type === "text" ? (
                    <div className="space-y-3">
                      <h3
                        className="text-lg font-semibold text-gray-900"
                        dangerouslySetInnerHTML={{ __html: notice.title || "" }}
                      />
                      <div>
                        {(() => {
                          const plain = getPlainText(notice.description || "");
                          return expandedNotices[notice._id] ? (
                            <div
                              className="text-gray-700"
                              style={{ textAlign: "justify" }}
                              dangerouslySetInnerHTML={{
                                __html: notice.description || "",
                              }}
                            />
                          ) : (
                            <p
                              className="text-gray-700 whitespace-pre-wrap"
                              style={{ textAlign: "justify" }}
                            >
                              {truncateText(plain, 2)}
                            </p>
                          );
                        })()}
                        {(() => {
                          const plain = getPlainText(notice.description || "");
                          return plain.split("\n").length > 2 ||
                            plain.length > 160 ? (
                            <button
                              onClick={() =>
                                toggleExpandDescription(notice._id)
                              }
                              className="text-[var(--color-primary)] hover:text-[var(--color-primary-strong)] font-medium text-sm mt-2"
                            >
                              {expandedNotices[notice._id]
                                ? "Show Less"
                                : "Show More"}
                            </button>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notice.caption && (
                        <h3 className="text-lg font-semibold text-gray-900">
                          {notice.caption}
                        </h3>
                      )}
                      <div className="max-w-lg overflow-hidden rounded-lg border border-gray-200 mt-2 shadow-sm">
                        <img
                          src={notice.imagePath}
                          alt={notice.caption || "Notice image"}
                          className="w-full h-auto max-h-[350px] object-contain bg-gray-50/50"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
              <p className="text-gray-600 text-lg">
                No notices found for the selected date range.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Delete Notice?
            </h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this notice? This action cannot be
              undone.
            </p>
            <div className="flex gap-3 justify-end pt-4">
              <Button
                onClick={() => setDeleteConfirmId(null)}
                variant="secondary"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDeleteNotice(deleteConfirmId)}
                variant="primary"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
