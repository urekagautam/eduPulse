import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../src/db/index.js";
import { FEATURE_NAMES, buildLabelledPerformanceDataset } from "../src/ml/performancePrediction.js";
import { DEFAULT_K, predictWithKnn, trainKnnClassifier } from "../src/ml/performanceKnn.js";

dotenv.config();

const CATEGORIES = ["At Risk", "Average", "Good", "Excellent"];

const splitRows = (rows) => {
  const ordered = [...rows].sort((a, b) =>
    `${a.studentId}-${a.targetExamId}`.localeCompare(`${b.studentId}-${b.targetExamId}`),
  );
  const testEvery = 5;
  return {
    train: ordered.filter((_, index) => index % testEvery !== 0),
    test: ordered.filter((_, index) => index % testEvery === 0),
  };
};

const emptyMatrix = () =>
  Object.fromEntries(
    CATEGORIES.map((actual) => [
      actual,
      Object.fromEntries(CATEGORIES.map((predicted) => [predicted, 0])),
    ]),
  );

try {
  await connectDB();
  const rows = await buildLabelledPerformanceDataset();
  const { train, test } = splitRows(rows);
  const model = trainKnnClassifier(train, FEATURE_NAMES, { k: DEFAULT_K });

  if (!model || !test.length) {
    console.log(`Rows: ${rows.length}, train: ${train.length}, test: ${test.length}`);
    console.log("Not enough labelled rows to evaluate the KNN model yet.");
    process.exitCode = 1;
  } else {
    const matrix = emptyMatrix();
    let correct = 0;

    test.forEach((row) => {
      const prediction = predictWithKnn(model, row.features);
      const actual = row.label.riskCategory;
      const predicted = prediction?.riskCategory?.label || "Unavailable";
      if (matrix[actual]?.[predicted] != null) matrix[actual][predicted] += 1;
      if (actual === predicted) correct += 1;
    });

    const accuracy = (correct / test.length) * 100;
    console.log(`Rows: ${rows.length}`);
    console.log(`Train rows: ${train.length}`);
    console.log(`Test rows: ${test.length}`);
    console.log(`K: ${DEFAULT_K}`);
    console.log(`Risk category accuracy: ${accuracy.toFixed(1)}%`);
    console.log("Confusion matrix:");
    console.table(matrix);
  }
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
