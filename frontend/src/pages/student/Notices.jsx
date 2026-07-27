import { useState } from "react";

const dummyNotices = [
  {
    _id: "1",
    type: "text",
    title: "Mid-Semester Exams Schedule",
    description: "Exams from June 15th to June 22nd. Check schedule.",
    createdAt: "2024-05-16",
  },
  {
    _id: "2",
    type: "image",
    caption: "Annual Sports Day - June 2024",
    imagePath: "/public/uploads/sample-notice.jpg",
    createdAt: "2024-05-10",
  },
];

export default function Notices() {
  const [expanded, setExpanded] = useState({});

  const toggle = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Notices & Schedules
        </h1>
        <p className="text-gray-600 mt-1">
          View notices, exam schedules and seating plans posted by the admin.
        </p>
      </div>

      <div className="space-y-4">
        {dummyNotices.map((n) => (
          <div
            key={n._id}
            className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"
          >
            <div className="flex justify-between items-start mb-3">
              <span className="inline-block bg-[var(--color-primary-bg)] text-[var(--color-primary-strong)] px-3 py-1 rounded-full text-sm font-medium">
                {new Date(n.createdAt).toLocaleDateString()}
              </span>
            </div>
            {n.type === "text" ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {n.title}
                </h3>
                <p className="text-gray-700 mt-2 whitespace-pre-wrap">
                  {expanded[n._id]
                    ? n.description
                    : n.description.length > 160
                      ? n.description.slice(0, 160) + "..."
                      : n.description}
                </p>
                {n.description.length > 160 && (
                  <button
                    onClick={() => toggle(n._id)}
                    className="text-[var(--color-primary)] mt-2"
                  >
                    {expanded[n._id] ? "Show Less" : "Show More"}
                  </button>
                )}
              </div>
            ) : (
              <div>
                {n.caption && (
                  <h3 className="text-lg font-semibold text-gray-900">
                    {n.caption}
                  </h3>
                )}
                <div className="max-w-lg overflow-hidden rounded-lg border border-gray-200 mt-3 shadow-sm">
                  <img
                    src={n.imagePath}
                    alt={n.caption || "Notice"}
                    className="w-full h-auto max-h-[350px] object-contain bg-gray-50/50"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
