import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import Button from "../Button";
import ClassLayoutDiagram from "./ClassLayoutDiagram";
import ClassLayoutWizard from "./ClassLayoutWizard";
import { countSeats } from "../../data/examDummyData";

export default function ClassLayoutsTab({ layouts, onSaveLayouts }) {
  const [showWizard, setShowWizard] = useState(false);
  const [editingLayout, setEditingLayout] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const handleSave = (layout) => {
    const exists = layouts.some((l) => l.id === layout.id);
    if (exists) {
      onSaveLayouts(layouts.map((l) => (l.id === layout.id ? layout : l)));
    } else {
      onSaveLayouts([...layouts, layout]);
    }
    setShowWizard(false);
    setEditingLayout(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Class Layout</h1>
          <p className="text-gray-600 mt-1">Add room layouts for seat planning</p>
        </div>
        <Button
          onClick={() => {
            setEditingLayout(null);
            setShowWizard(true);
          }}
        >
          Add new layout
        </Button>
      </div>

      {layouts.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg bg-white">
          <p className="text-lg font-semibold text-gray-700">No layout found</p>
          <p className="text-gray-500 mt-1 mb-4">Create a room layout first.</p>
          <Button onClick={() => setShowWizard(true)}>Add new layout</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {layouts.map((layout) => (
            <div
              key={layout.id}
              className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Room {layout.roomNumber}</h2>
                  <p className="text-sm text-gray-500">{countSeats(layout)} seats</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLayout(layout);
                      setShowWizard(true);
                    }}
                    className="p-2 text-[var(--color-primary)] hover:bg-[var(--color-primary-bg)] rounded-lg"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(layout.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-5 bg-gray-50">
                <ClassLayoutDiagram layout={layout} />
              </div>
            </div>
          ))}
        </div>
      )}

      {showWizard && (
        <ClassLayoutWizard
          initialLayout={editingLayout}
          onSave={handleSave}
          onCancel={() => {
            setShowWizard(false);
            setEditingLayout(null);
          }}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <p className="font-semibold text-gray-900">Delete this layout?</p>
            <p className="text-sm text-gray-500 mt-1">This cannot be undone.</p>
            <div className="flex gap-3 mt-6 justify-end">
              <Button variant="secondary" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  onSaveLayouts(layouts.filter((l) => l.id !== deleteId));
                  setDeleteId(null);
                }}
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
