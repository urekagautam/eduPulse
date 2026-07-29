const DEFAULT_K = 7;
const DEFAULT_MIN_ROWS = 12;

const round = (value, places = 2) => {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Number(Number(value).toFixed(places));
};

const makeFeatureVector = (features, featureNames) =>
  featureNames.map((name) => Number(features[name] ?? 0));

const distance = (a, b) =>
  Math.sqrt(a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0));

const majorityVote = (neighbors) => {
  const counts = new Map();
  neighbors.forEach((neighbor) => {
    counts.set(neighbor.label, (counts.get(neighbor.label) || 0) + 1);
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || [null, 0];
};

const categoryColor = (label) => {
  if (label === "At Risk") return "red";
  if (label === "Average") return "yellow";
  if (label === "Good") return "blue";
  if (label === "Excellent") return "green";
  return "gray";
};

export const trainKnnClassifier = (rows, featureNames, options = {}) => {
  const minimumRows = options.minRows || DEFAULT_MIN_ROWS;
  if (!Array.isArray(rows) || rows.length < minimumRows) return null;

  return {
    algorithm: "KNearestNeighborsClassifier",
    featureNames,
    k: options.k || DEFAULT_K,
    sampleCount: rows.length,
    trainedAt: new Date().toISOString(),
    samples: rows.map((row) => ({
      x: makeFeatureVector(row.features, featureNames),
      label: row.label.riskCategory,
    })),
  };
};

export const predictWithKnn = (model, features) => {
  if (!model?.samples?.length) return null;

  const vector = makeFeatureVector(features, model.featureNames);
  const k = Math.min(model.k || DEFAULT_K, model.samples.length);
  const neighbors = model.samples
    .map((sample) => ({
      label: sample.label,
      distance: distance(vector, sample.x),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);

  const [label, votes] = majorityVote(neighbors);
  if (!label) return null;

  return {
    riskCategory: {
      label,
      color: categoryColor(label),
    },
    confidencePercent: round((votes / k) * 100, 1),
    neighborCount: k,
  };
};

export { DEFAULT_K, DEFAULT_MIN_ROWS };
