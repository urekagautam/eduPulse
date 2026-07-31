import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import connectDB from "../src/db/index.js";
import {
  FEATURE_NAMES,
  buildLabelledPerformanceDataset,
  predictWithModel,
  trainRandomForest,
} from "../src/ml/performancePrediction.js";
import {
  DEFAULT_K,
  predictWithKnn,
  trainKnnClassifier,
} from "../src/ml/performanceKnn.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORT_DIR = path.resolve(__dirname, "../ml/reports");
const CATEGORIES = ["At Risk", "Average", "Good", "Excellent"];
const POSITIVE_CLASS = "At Risk";

const round = (value, places = 2) => Number(Number(value).toFixed(places));

const splitRows = (rows) => {
  const ordered = [...rows].sort((a, b) =>
    `${a.studentId}-${a.targetExamId}`.localeCompare(`${b.studentId}-${b.targetExamId}`),
  );

  return {
    train: ordered.filter((_, index) => index % 5 !== 0),
    test: ordered.filter((_, index) => index % 5 === 0),
  };
};

const emptyMatrix = () =>
  Object.fromEntries(
    CATEGORIES.map((actual) => [
      actual,
      Object.fromEntries(CATEGORIES.map((predicted) => [predicted, 0])),
    ]),
  );

const matrixToArray = (matrix) =>
  CATEGORIES.map((actual) => CATEGORIES.map((predicted) => matrix[actual][predicted]));

const addToMatrix = (matrix, actual, predicted) => {
  if (matrix[actual]?.[predicted] != null) matrix[actual][predicted] += 1;
};

const getColumnTotal = (matrix, predicted) =>
  CATEGORIES.reduce((sum, actual) => sum + matrix[actual][predicted], 0);

const getRowTotal = (matrix, actual) =>
  CATEGORIES.reduce((sum, predicted) => sum + matrix[actual][predicted], 0);

const classificationReport = (matrix) => {
  const total = CATEGORIES.reduce((sum, actual) => sum + getRowTotal(matrix, actual), 0);
  const correct = CATEGORIES.reduce((sum, label) => sum + matrix[label][label], 0);

  const rows = CATEGORIES.map((label) => {
    const tp = matrix[label][label];
    const support = getRowTotal(matrix, label);
    const predictedTotal = getColumnTotal(matrix, label);
    const precision = predictedTotal ? tp / predictedTotal : 0;
    const recall = support ? tp / support : 0;
    const f1Score = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;

    return {
      className: label,
      precision,
      recall,
      f1Score,
      support,
    };
  });

  const macro = rows.reduce(
    (sum, row) => ({
      precision: sum.precision + row.precision,
      recall: sum.recall + row.recall,
      f1Score: sum.f1Score + row.f1Score,
    }),
    { precision: 0, recall: 0, f1Score: 0 },
  );

  const weighted = rows.reduce(
    (sum, row) => ({
      precision: sum.precision + row.precision * row.support,
      recall: sum.recall + row.recall * row.support,
      f1Score: sum.f1Score + row.f1Score * row.support,
    }),
    { precision: 0, recall: 0, f1Score: 0 },
  );

  return {
    accuracy: total ? round((correct / total) * 100, 2) : 0,
    rows: rows.map((row) => ({
      className: row.className,
      precision: round(row.precision, 2),
      recall: round(row.recall, 2),
      f1Score: round(row.f1Score, 2),
      support: row.support,
    })),
    macroAvg: {
      precision: round(macro.precision / CATEGORIES.length, 2),
      recall: round(macro.recall / CATEGORIES.length, 2),
      f1Score: round(macro.f1Score / CATEGORIES.length, 2),
      support: total,
    },
    weightedAvg: {
      precision: total ? round(weighted.precision / total, 2) : 0,
      recall: total ? round(weighted.recall / total, 2) : 0,
      f1Score: total ? round(weighted.f1Score / total, 2) : 0,
      support: total,
    },
  };
};

const binaryReport = (pairs) => {
  const counts = { TP: 0, TN: 0, FP: 0, FN: 0 };

  pairs.forEach(({ actual, predicted }) => {
    const actualPositive = actual === POSITIVE_CLASS;
    const predictedPositive = predicted === POSITIVE_CLASS;
    if (actualPositive && predictedPositive) counts.TP += 1;
    else if (!actualPositive && !predictedPositive) counts.TN += 1;
    else if (!actualPositive && predictedPositive) counts.FP += 1;
    else counts.FN += 1;
  });

  const { TP, TN, FP, FN } = counts;
  const total = TP + TN + FP + FN;
  const precision = TP + FP ? TP / (TP + FP) : 0;
  const recall = TP + FN ? TP / (TP + FN) : 0;
  const f1Score = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    positiveClass: POSITIVE_CLASS,
    negativeClass: "Not At Risk",
    TP,
    TN,
    FP,
    FN,
    confusionMatrix: [
      [TN, FP],
      [FN, TP],
    ],
    accuracy: total ? round(((TP + TN) / total) * 100, 2) : 0,
    precision: round(precision * 100, 2),
    recall: round(recall * 100, 2),
    f1Score: round(f1Score * 100, 2),
  };
};

const computeRoc = (scoredRows) => {
  const positives = scoredRows.filter((row) => row.actualPositive).length;
  const negatives = scoredRows.length - positives;

  if (!positives || !negatives) {
    return {
      auc: null,
      points: [
        { fpr: 0, tpr: 0 },
        { fpr: 1, tpr: 1 },
      ],
    };
  }

  const ordered = [...scoredRows].sort((a, b) => b.score - a.score);
  const points = [{ fpr: 0, tpr: 0 }];
  let tp = 0;
  let fp = 0;
  let lastScore = null;

  ordered.forEach((row) => {
    if (lastScore !== null && row.score !== lastScore) {
      points.push({ fpr: fp / negatives, tpr: tp / positives });
    }
    if (row.actualPositive) tp += 1;
    else fp += 1;
    lastScore = row.score;
  });

  points.push({ fpr: fp / negatives, tpr: tp / positives });

  let auc = 0;
  for (let i = 1; i < points.length; i += 1) {
    const previous = points[i - 1];
    const current = points[i];
    auc += ((current.fpr - previous.fpr) * (previous.tpr + current.tpr)) / 2;
  }

  return {
    auc: round(auc, 4),
    points: points.map((point) => ({
      fpr: round(point.fpr, 4),
      tpr: round(point.tpr, 4),
    })),
  };
};

const makeKnnRiskScore = (model, features) => {
  const vector = model.featureNames.map((name) => Number(features[name] ?? 0));
  const k = Math.min(model.k || DEFAULT_K, model.samples.length);
  const neighbors = model.samples
    .map((sample) => ({
      label: sample.label,
      distance: Math.sqrt(
        vector.reduce((sum, value, index) => sum + (value - sample.x[index]) ** 2, 0),
      ),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);

  const atRiskVotes = neighbors.filter((neighbor) => neighbor.label === POSITIVE_CLASS).length;
  return k ? atRiskVotes / k : 0;
};

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const buildConfusionMatrixSvg = ({ title, labels, matrix }) => {
  const size = 84;
  const left = 132;
  const top = 72;
  const width = left + labels.length * size + 36;
  const height = top + labels.length * size + 72;
  const max = Math.max(...matrix.flat(), 1);

  const cells = matrix
    .map((row, rowIndex) =>
      row
        .map((value, columnIndex) => {
          const intensity = value / max;
          const blue = Math.round(245 - intensity * 135);
          const fill = `rgb(${blue},${Math.round(248 - intensity * 110)},255)`;
          const textColor = intensity > 0.62 ? "#ffffff" : "#111827";
          return `<rect x="${left + columnIndex * size}" y="${top + rowIndex * size}" width="${size}" height="${size}" fill="${fill}" stroke="#cbd5e1"/>
<text x="${left + columnIndex * size + size / 2}" y="${top + rowIndex * size + size / 2 + 6}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="20" font-weight="600" fill="${textColor}">${value}</text>`;
        })
        .join("\n"),
    )
    .join("\n");

  const columnLabels = labels
    .map(
      (label, index) =>
        `<text x="${left + index * size + size / 2}" y="${top - 16}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="11">${escapeXml(label)}</text>`,
    )
    .join("\n");

  const rowLabels = labels
    .map(
      (label, index) =>
        `<text x="${left - 12}" y="${top + index * size + size / 2 + 4}" text-anchor="end" font-family="Segoe UI, Arial" font-size="11">${escapeXml(label)}</text>`,
    )
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="100%" height="100%" fill="#ffffff"/>
<text x="${width / 2}" y="28" text-anchor="middle" font-family="Segoe UI, Arial" font-size="16" font-weight="600">${escapeXml(title)}</text>
<text x="${left + (labels.length * size) / 2}" y="52" text-anchor="middle" font-family="Segoe UI, Arial" font-size="12" fill="#475569">Predicted</text>
<text x="20" y="${top + (labels.length * size) / 2}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="12" fill="#475569" transform="rotate(-90 20 ${top + (labels.length * size) / 2})">Actual</text>
${columnLabels}
${rowLabels}
${cells}
</svg>`;
};

const buildRocSvg = ({ title, points, auc }) => {
  const width = 560;
  const height = 420;
  const pad = 64;
  const plotWidth = width - pad * 2;
  const plotHeight = height - pad * 2;
  const xy = (fpr, tpr) => [
    pad + fpr * plotWidth,
    pad + (1 - tpr) * plotHeight,
  ];

  const line = points
    .map((point, index) => {
      const [x, y] = xy(point.fpr, point.tpr);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const [x0, y0] = xy(0, 0);
  const [x1, y1] = xy(1, 1);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<rect width="100%" height="100%" fill="#ffffff"/>
<text x="${width / 2}" y="30" text-anchor="middle" font-family="Segoe UI, Arial" font-size="16" font-weight="600">${escapeXml(title)}</text>
<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${pad + plotHeight}" stroke="#111827"/>
<line x1="${pad}" y1="${pad + plotHeight}" x2="${pad + plotWidth}" y2="${pad + plotHeight}" stroke="#111827"/>
<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="#94a3b8" stroke-dasharray="5 5"/>
<path d="${line}" fill="none" stroke="#2563eb" stroke-width="3"/>
<text x="${width / 2}" y="${height - 16}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="12">False Positive Rate</text>
<text x="20" y="${height / 2}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="12" transform="rotate(-90 20 ${height / 2})">True Positive Rate</text>
<text x="${pad}" y="${pad + plotHeight + 20}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="11">0.0</text>
<text x="${pad + plotWidth}" y="${pad + plotHeight + 20}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="11">1.0</text>
<text x="${pad - 14}" y="${pad + plotHeight + 4}" text-anchor="end" font-family="Segoe UI, Arial" font-size="11">0.0</text>
<text x="${pad - 14}" y="${pad + 4}" text-anchor="end" font-family="Segoe UI, Arial" font-size="11">1.0</text>
<rect x="${width - 150}" y="${pad + 12}" width="112" height="34" rx="8" fill="#eff6ff" stroke="#bfdbfe"/>
<text x="${width - 94}" y="${pad + 34}" text-anchor="middle" font-family="Segoe UI, Arial" font-size="13" fill="#1d4ed8">AUC = ${auc ?? "N/A"}</text>
</svg>`;
};

const renderClassificationTable = (report) => {
  const lines = [
    "Class             Precision  Recall  F1-score  Support",
    "--------------------------------------------------------",
  ];

  report.rows.forEach((row) => {
    lines.push(
      `${row.className.padEnd(17)}${row.precision.toFixed(2).padStart(9)}${row.recall
        .toFixed(2)
        .padStart(8)}${row.f1Score.toFixed(2).padStart(10)}${String(row.support).padStart(9)}`,
    );
  });

  lines.push("--------------------------------------------------------");
  lines.push(
    `${"accuracy".padEnd(17)}${"".padStart(17)}${(report.accuracy / 100)
      .toFixed(2)
      .padStart(10)}${String(report.weightedAvg.support).padStart(9)}`,
  );
  lines.push(
    `${"macro avg".padEnd(17)}${report.macroAvg.precision
      .toFixed(2)
      .padStart(9)}${report.macroAvg.recall.toFixed(2).padStart(8)}${report.macroAvg.f1Score
      .toFixed(2)
      .padStart(10)}${String(report.macroAvg.support).padStart(9)}`,
  );
  lines.push(
    `${"weighted avg".padEnd(17)}${report.weightedAvg.precision
      .toFixed(2)
      .padStart(9)}${report.weightedAvg.recall.toFixed(2).padStart(8)}${report.weightedAvg.f1Score
      .toFixed(2)
      .padStart(10)}${String(report.weightedAvg.support).padStart(9)}`,
  );

  return lines.join("\n");
};

const writeReportFiles = async (report) => {
  await fs.mkdir(REPORT_DIR, { recursive: true });

  const files = {
    json: path.join(REPORT_DIR, "ml-evaluation-report.json"),
    text: path.join(REPORT_DIR, "ml-evaluation-summary.txt"),
    rfConfusion: path.join(REPORT_DIR, "random-forest-confusion-matrix.svg"),
    rfRoc: path.join(REPORT_DIR, "random-forest-roc-curve.svg"),
    knnConfusion: path.join(REPORT_DIR, "knn-confusion-matrix.svg"),
    knnRoc: path.join(REPORT_DIR, "knn-roc-curve.svg"),
  };

  const text = [
    "Examify ML Evaluation Report",
    `Generated: ${report.generatedAt}`,
    `Rows: ${report.dataset.rows}`,
    `Train rows: ${report.dataset.trainRows}`,
    `Test rows: ${report.dataset.testRows}`,
    "",
    "Binary evaluation rule:",
    "Positive class = At Risk",
    "Negative class = Average + Good + Excellent",
    "",
    "Random Forest Regression Model",
    `Accuracy: ${report.randomForest.binary.accuracy}%`,
    `Precision: ${report.randomForest.binary.precision}%`,
    `Recall: ${report.randomForest.binary.recall}%`,
    `F1 Score: ${report.randomForest.binary.f1Score}%`,
    `MAE: ${report.randomForest.regression.mae} percentage points`,
    `RMSE: ${report.randomForest.regression.rmse} percentage points`,
    `AUC: ${report.randomForest.roc.auc}`,
    `TP: ${report.randomForest.binary.TP}`,
    `TN: ${report.randomForest.binary.TN}`,
    `FP: ${report.randomForest.binary.FP}`,
    `FN: ${report.randomForest.binary.FN}`,
    "",
    "Classification Report for Random Forest Model:",
    renderClassificationTable(report.randomForest.classificationReport),
    "",
    "K-Nearest Neighbors Classification Model",
    `Accuracy: ${report.knn.binary.accuracy}%`,
    `Precision: ${report.knn.binary.precision}%`,
    `Recall: ${report.knn.binary.recall}%`,
    `F1 Score: ${report.knn.binary.f1Score}%`,
    `AUC: ${report.knn.roc.auc}`,
    `TP: ${report.knn.binary.TP}`,
    `TN: ${report.knn.binary.TN}`,
    `FP: ${report.knn.binary.FP}`,
    `FN: ${report.knn.binary.FN}`,
    "",
    "Classification Report for KNN Model:",
    renderClassificationTable(report.knn.classificationReport),
    "",
    `JSON report: ${files.json}`,
    `Random Forest confusion matrix: ${files.rfConfusion}`,
    `Random Forest ROC curve: ${files.rfRoc}`,
    `KNN confusion matrix: ${files.knnConfusion}`,
    `KNN ROC curve: ${files.knnRoc}`,
  ].join("\n");

  await fs.writeFile(files.json, JSON.stringify(report, null, 2));
  await fs.writeFile(files.text, text);
  await fs.writeFile(
    files.rfConfusion,
    buildConfusionMatrixSvg({
      title: "Confusion Matrix - Random Forest",
      labels: CATEGORIES,
      matrix: report.randomForest.confusionMatrix,
    }),
  );
  await fs.writeFile(
    files.knnConfusion,
    buildConfusionMatrixSvg({
      title: "Confusion Matrix - KNN",
      labels: CATEGORIES,
      matrix: report.knn.confusionMatrix,
    }),
  );
  await fs.writeFile(
    files.rfRoc,
    buildRocSvg({
      title: "ROC Curve - Random Forest At-Risk Detection",
      points: report.randomForest.roc.points,
      auc: report.randomForest.roc.auc,
    }),
  );
  await fs.writeFile(
    files.knnRoc,
    buildRocSvg({
      title: "ROC Curve - KNN At-Risk Detection",
      points: report.knn.roc.points,
      auc: report.knn.roc.auc,
    }),
  );

  return files;
};

try {
  await connectDB();
  const rows = await buildLabelledPerformanceDataset();
  const { train, test } = splitRows(rows);
  const randomForest = trainRandomForest(train);
  const knn = trainKnnClassifier(train, FEATURE_NAMES, { k: DEFAULT_K });

  if (!randomForest || !knn || !test.length) {
    console.log(`Rows: ${rows.length}`);
    console.log(`Train rows: ${train.length}`);
    console.log(`Test rows: ${test.length}`);
    console.log("Not enough labelled rows to generate an ML report.");
    process.exitCode = 1;
  } else {
    const rfMatrix = emptyMatrix();
    const knnMatrix = emptyMatrix();
    const rfPairs = [];
    const knnPairs = [];
    const rfScores = [];
    const knnScores = [];
    const rfErrors = [];

    test.forEach((row) => {
      const actualCategory = row.label.riskCategory;
      const actualPercent = Number(row.label.finalPercent);

      const rfPrediction = predictWithModel(randomForest, row.features);
      const rfCategory = rfPrediction?.riskCategory?.label;
      const rfPercent = Number(rfPrediction?.predictedPercent);
      addToMatrix(rfMatrix, actualCategory, rfCategory);
      rfPairs.push({ actual: actualCategory, predicted: rfCategory });
      rfScores.push({
        actualPositive: actualCategory === POSITIVE_CLASS,
        score: Number.isFinite(rfPercent) ? (100 - rfPercent) / 100 : 0,
      });
      if (Number.isFinite(actualPercent) && Number.isFinite(rfPercent)) {
        rfErrors.push(actualPercent - rfPercent);
      }

      const knnPrediction = predictWithKnn(knn, row.features);
      const knnCategory = knnPrediction?.riskCategory?.label;
      addToMatrix(knnMatrix, actualCategory, knnCategory);
      knnPairs.push({ actual: actualCategory, predicted: knnCategory });
      knnScores.push({
        actualPositive: actualCategory === POSITIVE_CLASS,
        score: makeKnnRiskScore(knn, row.features),
      });
    });

    const rfAbsErrors = rfErrors.map((value) => Math.abs(value));
    const rfSquaredErrors = rfErrors.map((value) => value ** 2);
    const rfReport = classificationReport(rfMatrix);
    const knnReport = classificationReport(knnMatrix);

    const report = {
      generatedAt: new Date().toISOString(),
      dataset: {
        rows: rows.length,
        trainRows: train.length,
        testRows: test.length,
        splitMethod: "Deterministic 80/20 split after sorting by student and target exam",
        features: FEATURE_NAMES,
      },
      binaryEvaluationRule: {
        positiveClass: POSITIVE_CLASS,
        negativeClass: "Average + Good + Excellent",
      },
      randomForest: {
        algorithm: "RandomForestRegressor",
        purpose: "Predict final exam percentage from academic, quiz, and attendance features.",
        regression: {
          mae: round(
            rfAbsErrors.reduce((sum, value) => sum + value, 0) /
              Math.max(rfAbsErrors.length, 1),
            2,
          ),
          rmse: round(
            Math.sqrt(
              rfSquaredErrors.reduce((sum, value) => sum + value, 0) /
                Math.max(rfSquaredErrors.length, 1),
            ),
            2,
          ),
        },
        classificationReport: rfReport,
        confusionMatrix: matrixToArray(rfMatrix),
        binary: binaryReport(rfPairs),
        roc: computeRoc(rfScores),
      },
      knn: {
        algorithm: "KNearestNeighborsClassifier",
        k: DEFAULT_K,
        purpose: "Classify the student risk category by comparing with nearest labelled records.",
        classificationReport: knnReport,
        confusionMatrix: matrixToArray(knnMatrix),
        binary: binaryReport(knnPairs),
        roc: computeRoc(knnScores),
      },
    };

    const files = await writeReportFiles(report);

    console.log("=== Examify ML Test Metrics ===");
    console.log(`Rows: ${report.dataset.rows}`);
    console.log(`Train rows: ${report.dataset.trainRows}`);
    console.log(`Test rows: ${report.dataset.testRows}`);
    console.log("");
    console.log("Random Forest Regression");
    console.log(`Accuracy: ${report.randomForest.binary.accuracy}%`);
    console.log(`Precision: ${report.randomForest.binary.precision}%`);
    console.log(`Recall: ${report.randomForest.binary.recall}%`);
    console.log(`F1 Score: ${report.randomForest.binary.f1Score}%`);
    console.log(`MAE: ${report.randomForest.regression.mae} percentage points`);
    console.log(`RMSE: ${report.randomForest.regression.rmse} percentage points`);
    console.log(`AUC: ${report.randomForest.roc.auc}`);
    console.log(`TP: ${report.randomForest.binary.TP}`);
    console.log(`TN: ${report.randomForest.binary.TN}`);
    console.log(`FP: ${report.randomForest.binary.FP}`);
    console.log(`FN: ${report.randomForest.binary.FN}`);
    console.log("");
    console.log("Classification Report for Random Forest Model:");
    console.log(renderClassificationTable(report.randomForest.classificationReport));
    console.log("");
    console.log("K-Nearest Neighbors Classification");
    console.log(`Accuracy: ${report.knn.binary.accuracy}%`);
    console.log(`Precision: ${report.knn.binary.precision}%`);
    console.log(`Recall: ${report.knn.binary.recall}%`);
    console.log(`F1 Score: ${report.knn.binary.f1Score}%`);
    console.log(`AUC: ${report.knn.roc.auc}`);
    console.log(`TP: ${report.knn.binary.TP}`);
    console.log(`TN: ${report.knn.binary.TN}`);
    console.log(`FP: ${report.knn.binary.FP}`);
    console.log(`FN: ${report.knn.binary.FN}`);
    console.log("");
    console.log("Classification Report for KNN Model:");
    console.log(renderClassificationTable(report.knn.classificationReport));
    console.log("");
    console.log("Generated files:");
    Object.values(files).forEach((file) => console.log(file));
  }
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
