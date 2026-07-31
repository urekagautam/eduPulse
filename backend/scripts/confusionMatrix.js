import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildLabelledPerformanceDataset,
  trainRandomForest,
  predictWithModel,
} from '../src/ml/performancePrediction.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATASET_PATH = path.resolve(__dirname, '../ml/data/student-performance-dataset.json');

const readDataset = async (path) => {
  try {
    const raw = await fs.readFile(path, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read dataset:', err.message);
    return null;
  }
};

const riskLabel = (percent) => {
  if (percent == null) return 'Unavailable';
  if (percent < 40) return 'At Risk';
  if (percent < 60) return 'Average';
  if (percent < 80) return 'Good';
  return 'Excellent';
};

const labelToIndex = (label) => {
  switch (label) {
    case 'At Risk':
      return 0;
    case 'Average':
      return 1;
    case 'Good':
      return 2;
    case 'Excellent':
      return 3;
    default:
      return 4; // Unavailable/other
  }
};

const computeConfusionMatrix = (trueLabels, predLabels, numClasses) => {
  const matrix = Array.from({ length: numClasses }, () => Array(numClasses).fill(0));
  for (let i = 0; i < trueLabels.length; i++) {
    const t = trueLabels[i];
    const p = predLabels[i];
    if (t == null || p == null) continue;
    matrix[t][p] += 1;
  }
  return matrix;
};

const indexToLabel = (i) => ['At Risk', 'Average', 'Good', 'Excellent', 'Unavailable'][i];

const main = async () => {
  // Try reading exported dataset, fallback to building via code if available
  let rows = await readDataset(DATASET_PATH);
  if (!rows) {
    console.log('No dataset file found; building from DB (this requires app environment).');
    try {
      rows = await buildLabelledPerformanceDataset();
    } catch (err) {
      console.error('Failed to build dataset from DB:', err.message);
      process.exit(1);
    }
  }

  // Split rows into train/test (same simple split as evaluation script)
  const ordered = [...rows].sort((a, b) =>
    `${a.studentId}-${a.targetExamId}`.localeCompare(`${b.studentId}-${b.targetExamId}`),
  );
  const testEvery = 5;
  const train = ordered.filter((_, index) => index % testEvery !== 0);
  const test = ordered.filter((_, index) => index % testEvery === 0);

  if (!train.length || !test.length) {
    console.error('Not enough data to perform train/test split.');
    process.exit(1);
  }

  const model = trainRandomForest(train);
  if (!model) {
    console.error('Failed to train RandomForest model (not enough rows).');
    process.exit(1);
  }

  const predictions = test.map((row) => {
    const pred = predictWithModel(model, row.features);
    return {
      actual: row.label?.riskCategory,
      predicted: pred?.riskCategory?.label ?? 'Unavailable',
    };
  });

  const trueLabels = predictions.map((p) => labelToIndex(p.actual));
  const predLabels = predictions.map((p) => labelToIndex(p.predicted));

  const numClasses = 4; // ignore Unavailable in matrix
  const matrix = computeConfusionMatrix(trueLabels, predLabels, numClasses);

  console.log('Confusion Matrix (rows=true, cols=pred):');
  console.table(matrix);

  const totalsByTrue = matrix.map((row) => row.reduce((s, v) => s + v, 0));
  const totalsByPred = Array.from({ length: numClasses }, (_, c) =>
    matrix.reduce((s, row) => s + row[c], 0),
  );
  const correct = matrix.reduce((s, row, i) => s + row[i], 0);
  const total = totalsByTrue.reduce((s, v) => s + v, 0);
  const accuracy = total ? (correct / total) * 100 : 0;

  console.log(`Accuracy: ${accuracy.toFixed(2)}%`);

  const perClass = matrix.map((row, i) => {
    const tp = row[i];
    const fn = totalsByTrue[i] - tp;
    const fp = totalsByPred[i] - tp;
    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    return {
      class: indexToLabel(i),
      precision: precision.toFixed(3),
      recall: recall.toFixed(3),
      support: totalsByTrue[i],
    };
  });

  console.table(perClass);
};

if (process.argv[1] === __filename) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
