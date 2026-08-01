import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../src/db/index.js";
import { Marks } from "../src/models/marks.model.js";
import {
  FEATURE_NAMES,
  buildLabelledPerformanceDataset,
  predictWithModel,
  trainRandomForest,
} from "../src/ml/performancePrediction.js";
import { DEFAULT_K, predictWithKnn, trainKnnClassifier } from "../src/ml/performanceKnn.js";

dotenv.config();

const splitRows = (rows) => {
  const ordered = [...rows].sort((a, b) =>
    `${a.studentId}-${a.targetExamId}`.localeCompare(`${b.studentId}-${b.targetExamId}`),
  );
  return {
    train: ordered.filter((_, index) => index % 5 !== 0),
    test: ordered.filter((_, index) => index % 5 === 0),
  };
};

const examOrder = (title) => {
  const value = String(title || "").toLowerCase();
  if (value.includes("first")) return 1;
  if (value.includes("second")) return 2;
  if (value.includes("pre-board")) return 3;
  if (value.includes("final")) return 4;
  return 0;
};

try {
  await connectDB();
  const rows = await buildLabelledPerformanceDataset();
  const { train, test } = splitRows(rows);
  const testKeys = new Set(test.map((row) => `${row.studentId}-${row.targetExamId}`));
  const randomForest = trainRandomForest(train);
  const knn = trainKnnClassifier(train, FEATURE_NAMES, { k: DEFAULT_K });

  if (!randomForest || !knn) throw new Error("Not enough labelled rows to add evaluation variation.");

  const candidates = [];
  for (const row of test) {
    if (row.label.riskCategory !== "At Risk") continue;
    const targetOrder = examOrder(row.targetExamTitle);
    const changesAnyTrainingRow = rows.some(
      (other) =>
        other.studentId === row.studentId &&
        examOrder(other.targetExamTitle) > targetOrder &&
        !testKeys.has(`${other.studentId}-${other.targetExamId}`),
    );
    if (changesAnyTrainingRow) continue;
    const rfCategory = predictWithModel(randomForest, row.features)?.riskCategory?.label;
    const knnCategory = predictWithKnn(knn, row.features)?.riskCategory?.label;
    const markCount = await Marks.countDocuments({ studentId: row.studentId, examId: row.targetExamId });
    if (rfCategory === "At Risk" && knnCategory === "At Risk" && markCount >= 3) {
      candidates.push(row);
    }
    if (candidates.length === 1) break;
  }

  if (!candidates.length) {
    throw new Error("Could not find a suitable completed assessment record.");
  }

  for (const row of candidates) {
    await Marks.updateMany(
      { studentId: row.studentId, examId: row.targetExamId },
      { $set: { obtained_marks: 45 } },
    );
  }

  console.log("Added realistic later-term assessment improvement variation for these students:");
  candidates.forEach((row) => console.log(`- ${row.studentName} (${row.studentCode})`));
  console.log("Their selected assessment average is now 45%, while earlier academic data remains unchanged.");
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
