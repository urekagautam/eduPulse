/** Room layout: board + rectangular section blocks */
export default function ClassLayoutDiagram({ layout, assignments = {} }) {
  if (!layout?.sections?.length) {
    return (
      <p className="text-sm text-gray-500 text-center py-6 border border-dashed border-gray-300 rounded-lg">
        Layout preview will show here
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-gray-800 text-white text-center py-2 rounded-lg text-sm font-medium">
        BOARD (front)
      </div>

      <div className="flex gap-3 flex-wrap justify-center">
        {layout.sections.map((section) => (
          <div
            key={section.id}
            className="border-2 border-gray-300 rounded-lg p-3 bg-gray-50 min-w-[90px]"
          >
            <p className="text-xs font-semibold text-gray-600 text-center mb-2">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.rows.map((row) => (
                <div key={row.id} className="flex gap-1 justify-center">
                  {row.seats.map((seat) => {
                    const student = assignments[seat.id];
                    return (
                      <div
                        key={seat.id}
                        title={student ? student.rollNo : "empty"}
                        className={`w-9 h-7 border border-gray-400 rounded text-[9px] flex items-center justify-center ${
                          student
                            ? "bg-[var(--color-primary-bg)] border-[var(--color-primary-border)] font-medium"
                            : "bg-white"
                        }`}
                      >
                        {student ? student.rollNo.split("-").pop() : ""}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
