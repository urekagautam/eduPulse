import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Attendance } from "../models/attendance.model.js";
import { ClassAttendanceSession } from "../models/classAttendanceSession.model.js";
import { ClassOffering } from "../models/classOffering.model.js";
import { Exam } from "../models/exam.model.js";
import { ExamAttendance } from "../models/examAttendance.model.js";
import { Faculty } from "../models/faculty.model.js";
import { Marks } from "../models/marks.model.js";
import { Quiz } from "../models/quiz.model.js";
import { QuizSubmission } from "../models/quizSubmission.model.js";
import { Student } from "../models/student.model.js";
import { Subject } from "../models/subject.model.js";
import {
  DEFAULT_K,
  DEFAULT_MIN_ROWS,
  predictWithKnn,
  trainKnnClassifier,
} from "./performanceKnn.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MODEL_PATH = path.resolve(__dirname, "../../ml/models/performance-random-forest.json");
const DATASET_PATH = path.resolve(__dirname, "../../ml/data/student-performance-dataset.json");

const FEATURE_NAMES = [
  "classAttendancePercent",
  "examAttendancePercent",
  "weightedExamAttendanceScore",
  "quizPercent",
  "quizCompletionPercent",
  "firstExamPercent",
  "secondExamPercent",
  "preboardPercent",
  "latestExamPercent",
  "weightedExamPercent",
  "completedExamCount",
];

const MIN_RANDOM_FOREST_ROWS = 12;
const DEFAULT_FEATURES = Object.fromEntries(FEATURE_NAMES.map((name) => [name, 0]));

const round = (value, places = 2) => {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Number(Number(value).toFixed(places));
};

export const riskCategoryForPercent = (percent) => {
  if (percent == null) return { label: "Unavailable", color: "gray" };
  if (percent < 40) return { label: "At Risk", color: "red" };
  if (percent < 60) return { label: "Average", color: "yellow" };
  if (percent < 80) return { label: "Good", color: "blue" };
  return { label: "Excellent", color: "green" };
};

const percentage = (obtained, full) =>
  full ? Math.max(0, Math.min(100, (Number(obtained || 0) / Number(full)) * 100)) : null;

const dateKey = (value) => new Date(value).toISOString().slice(0, 10);

const examDateValue = (exam) => {
  const dates = (exam.items || [])
    .map((item) => item.examDate)
    .filter(Boolean)
    .map((date) => new Date(date).getTime());
  return dates.length ? Math.min(...dates) : new Date(exam.createdAt || 0).getTime();
};

const examPriority = (exam, index, total) => {
  const title = String(exam.title || "").toLowerCase();
  if (title.includes("pre") || title.includes("board") || title.includes("third")) return 3;
  if (title.includes("second")) return 2;
  if (title.includes("first")) return 1;
  return Math.min(index + 1, Math.max(total, 1));
};

const isFinalExam = (exam) => String(exam.title || "").toLowerCase().includes("final");

const mean = (values) => {
  const valid = values.filter((value) => value != null && !Number.isNaN(Number(value)));
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + Number(value), 0) / valid.length;
};

const weightedMean = (items) => {
  const valid = items.filter((item) => item.value != null && item.weight > 0);
  if (!valid.length) return null;
  const totalWeight = valid.reduce((sum, item) => sum + item.weight, 0);
  return valid.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
};

const makeFeatureVector = (features) =>
  FEATURE_NAMES.map((name) => Number(features[name] ?? 0));

const calculateClassAttendancePercent = async ({ studentId, classFilter, offeringIds }) => {
  const sessions = await ClassAttendanceSession.find(classFilter).select("date");
  const classDates = new Set(sessions.map((session) => dateKey(session.date)));
  const records = offeringIds.length
    ? await Attendance.find({
        studentId,
        $or: [classFilter, { classOfferingId: { $in: offeringIds } }],
      }).select("date status")
    : [];

  records.forEach((record) => classDates.add(dateKey(record.date)));
  const presentDates = new Set(
    records
      .filter((record) => record.status === "present")
      .map((record) => dateKey(record.date)),
  );

  return classDates.size ? (presentDates.size / classDates.size) * 100 : null;
};

const buildSubjectMarkLookup = async ({ studentIds, examIds }) => {
  const marks = await Marks.find({
    studentId: { $in: studentIds },
    examId: { $in: examIds },
  }).populate("classOfferingId");

  const byStudentExam = new Map();
  marks.forEach((mark) => {
    const studentId = mark.studentId.toString();
    const examId = mark.examId.toString();
    const subjectId = mark.classOfferingId?.subjectId?.toString();
    if (!subjectId) return;
    const key = `${studentId}-${examId}`;
    if (!byStudentExam.has(key)) byStudentExam.set(key, new Map());
    byStudentExam.get(key).set(subjectId, Number(mark.obtained_marks));
  });

  return byStudentExam;
};

const examSubjects = (exam, subjectIds) => {
  const routineSubjectIds = (exam.items || [])
    .map((item) => item.subjectId?.toString())
    .filter(Boolean);
  return routineSubjectIds.length ? routineSubjectIds : subjectIds;
};

const calculateExamPercent = ({ studentId, exam, subjectIds, markLookup }) => {
  const subjects = examSubjects(exam, subjectIds);
  const marks = markLookup.get(`${studentId}-${exam._id.toString()}`) || new Map();
  const fullMarks = Number(exam.fullMarks || 100);
  const obtained = subjects.map((subjectId) => marks.get(subjectId));
  const complete = subjects.length > 0 && obtained.every((value) => value != null);
  if (!complete) return null;
  return percentage(
    obtained.reduce((sum, value) => sum + Number(value || 0), 0),
    subjects.length * fullMarks,
  );
};

const calculateExamAttendanceFeatures = async ({ studentId, classFilter, exams }) => {
  const records = await ExamAttendance.find({ studentId, ...classFilter }).select(
    "examId status",
  );
  const recordsByExam = new Map();
  records.forEach((record) => {
    const examId = record.examId.toString();
    if (!recordsByExam.has(examId)) recordsByExam.set(examId, []);
    recordsByExam.get(examId).push(record);
  });

  const examItems = exams.map((exam, index) => {
    const examRecords = recordsByExam.get(exam._id.toString()) || [];
    const present = examRecords.filter((record) => record.status === "present").length;
    return {
      value: examRecords.length ? (present / examRecords.length) * 100 : null,
      weight: examPriority(exam, index, exams.length),
    };
  });

  return {
    examAttendancePercent: records.length
      ? (records.filter((record) => record.status === "present").length / records.length) * 100
      : null,
    weightedExamAttendanceScore: weightedMean(examItems),
  };
};

const calculateQuizFeatures = async ({ studentId, classFilter }) => {
  const quizzes = await Quiz.find({ ...classFilter, status: "published" }).select(
    "_id questions",
  );
  if (!quizzes.length) {
    return { quizPercent: null, quizCompletionPercent: null };
  }

  const submissions = await QuizSubmission.find({
    studentId,
    quizId: { $in: quizzes.map((quiz) => quiz._id) },
    status: "submitted",
  }).select("quizId obtainedMarks fullMarks");

  const obtained = submissions.reduce(
    (sum, submission) => sum + Number(submission.obtainedMarks || 0),
    0,
  );
  const full = submissions.reduce(
    (sum, submission) => sum + Number(submission.fullMarks || 0),
    0,
  );

  return {
    quizPercent: percentage(obtained, full),
    quizCompletionPercent: (submissions.length / quizzes.length) * 100,
  };
};

const makeFeaturesFromExamPercents = ({ examPercents, exams }) => {
  const weighted = exams.map((exam, index) => ({
    value: examPercents[index],
    weight: examPriority(exam, index, exams.length),
  }));
  const completed = examPercents.filter((value) => value != null);
  return {
    firstExamPercent: examPercents[0] ?? null,
    secondExamPercent: examPercents[1] ?? null,
    preboardPercent: examPercents[2] ?? examPercents[examPercents.length - 1] ?? null,
    latestExamPercent: completed[completed.length - 1] ?? null,
    weightedExamPercent: weightedMean(weighted),
    completedExamCount: completed.length,
  };
};

const normalizeFeatures = (features) => {
  const normalized = { ...DEFAULT_FEATURES };
  FEATURE_NAMES.forEach((name) => {
    normalized[name] = round(features[name] ?? 0, 2);
  });
  return normalized;
};

export const buildStudentPerformanceFeatures = async ({ student, facultyId, level, batch }) => {
  const classFilter = { facultyId, level: Number(level), batch: Number(batch) };
  const subjects = await Subject.find({ facultyId, level: Number(level) }).select("_id");
  const subjectIds = subjects.map((subject) => subject._id.toString());
  const exams = await Exam.find(classFilter).sort({ createdAt: 1 });
  exams.sort((a, b) => examDateValue(a) - examDateValue(b));
  const featureExams = exams.filter((exam) => !isFinalExam(exam));

  const offerings = await ClassOffering.find(classFilter).select("_id");
  const offeringIds = offerings.map((offering) => offering._id);
  const markLookup = await buildSubjectMarkLookup({
    studentIds: [student._id],
    examIds: featureExams.map((exam) => exam._id),
  });
  const examPercents = featureExams.map((exam) =>
    calculateExamPercent({
      studentId: student._id.toString(),
      exam,
      subjectIds,
      markLookup,
    }),
  );

  const classAttendancePercent = await calculateClassAttendancePercent({
    studentId: student._id,
    classFilter,
    offeringIds,
  });
  const examAttendance = await calculateExamAttendanceFeatures({
    studentId: student._id,
    classFilter,
    exams: featureExams,
  });
  const quiz = await calculateQuizFeatures({ studentId: student._id, classFilter });
  const marks = makeFeaturesFromExamPercents({ examPercents, exams: featureExams });

  return {
    features: normalizeFeatures({
      classAttendancePercent,
      ...examAttendance,
      ...quiz,
      ...marks,
    }),
    metadata: {
      examCount: exams.length,
      completedExamCount: marks.completedExamCount,
      currentLevel: Number(level),
      batch: Number(batch),
      inputExamCount: featureExams.length,
      excludedFinalExamCount: exams.length - featureExams.length,
    },
  };
};

export const buildLabelledPerformanceDataset = async (filters = {}) => {
  const studentQuery = {
    isActive: true,
    academic_status: { $ne: "graduated" },
    ...(filters.facultyId ? { facultyId: filters.facultyId } : {}),
    ...(filters.level ? { current_level: Number(filters.level) } : {}),
    ...(filters.batch ? { admitted_batch: Number(filters.batch) } : {}),
  };
  const students = await Student.find(studentQuery).populate("facultyId");
  const rows = [];

  for (const student of students) {
    const faculty = student.facultyId;
    if (!faculty) continue;
    const level = Number(student.current_level);
    const batch = Number(student.admitted_batch);
    const classFilter = { facultyId: faculty._id, level, batch };
    const subjects = await Subject.find({ facultyId: faculty._id, level }).select("_id");
    const subjectIds = subjects.map((subject) => subject._id.toString());
    const exams = await Exam.find(classFilter).sort({ createdAt: 1 });
    exams.sort((a, b) => examDateValue(a) - examDateValue(b));
    if (!exams.length) continue;

    const offerings = await ClassOffering.find(classFilter).select("_id");
    const markLookup = await buildSubjectMarkLookup({
      studentIds: [student._id],
      examIds: exams.map((exam) => exam._id),
    });
    const fullExamPercents = exams.map((exam) =>
      calculateExamPercent({
        studentId: student._id.toString(),
        exam,
        subjectIds,
        markLookup,
      }),
    );
    const classAttendancePercent = await calculateClassAttendancePercent({
      studentId: student._id,
      classFilter,
      offeringIds: offerings.map((offering) => offering._id),
    });
    const quiz = await calculateQuizFeatures({ studentId: student._id, classFilter });

    for (let targetIndex = 0; targetIndex < fullExamPercents.length; targetIndex += 1) {
      const targetPercent = fullExamPercents[targetIndex];
      if (targetPercent == null || targetIndex === 0) continue;
      const priorExams = exams.slice(0, targetIndex);
      const priorPercents = fullExamPercents.map((value, index) =>
        index < targetIndex ? value : null,
      );
      const examAttendance = await calculateExamAttendanceFeatures({
        studentId: student._id,
        classFilter,
        exams: priorExams,
      });
      const marks = makeFeaturesFromExamPercents({
        examPercents: priorPercents.slice(0, targetIndex),
        exams: priorExams,
      });
      const features = normalizeFeatures({
        classAttendancePercent,
        ...examAttendance,
        ...quiz,
        ...marks,
      });
      const risk = riskCategoryForPercent(targetPercent);

      rows.push({
        studentId: student._id.toString(),
        studentCode: student.std_id,
        studentName: [student.first_name, student.middle_name, student.last_name]
          .filter(Boolean)
          .join(" "),
        facultyId: faculty._id.toString(),
        facultyCode: faculty.faculty_code,
        level,
        batch,
        targetExamId: exams[targetIndex]._id.toString(),
        targetExamTitle: exams[targetIndex].title,
        features,
        label: {
          finalPercent: round(targetPercent, 2),
          riskCategory: risk.label,
        },
      });
    }
  }

  return rows;
};

const variance = (values) => {
  if (!values.length) return 0;
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
};

const mulberry32 = (seed) => {
  let state = seed || 1;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

const sampleIndexes = (size, rng) =>
  Array.from({ length: size }, () => Math.floor(rng() * size));

const randomFeatureIndexes = (featureCount, rng) => {
  const count = Math.max(1, Math.floor(Math.sqrt(featureCount)));
  const indexes = new Set();
  while (indexes.size < count) indexes.add(Math.floor(rng() * featureCount));
  return Array.from(indexes);
};

const buildTree = (samples, depth, options, rng) => {
  const prediction =
    samples.reduce((sum, sample) => sum + sample.y, 0) / Math.max(samples.length, 1);

  if (
    depth >= options.maxDepth ||
    samples.length <= options.minSamplesSplit ||
    variance(samples.map((sample) => sample.y)) < 0.0001
  ) {
    return { prediction };
  }

  let best = null;
  randomFeatureIndexes(options.featureCount, rng).forEach((featureIndex) => {
    const values = Array.from(new Set(samples.map((sample) => sample.x[featureIndex]))).sort(
      (a, b) => a - b,
    );
    values.slice(1).forEach((value) => {
      const left = samples.filter((sample) => sample.x[featureIndex] < value);
      const right = samples.filter((sample) => sample.x[featureIndex] >= value);
      if (!left.length || !right.length) return;
      const score =
        variance(left.map((sample) => sample.y)) * left.length +
        variance(right.map((sample) => sample.y)) * right.length;
      if (!best || score < best.score) {
        best = { featureIndex, threshold: value, left, right, score };
      }
    });
  });

  if (!best) return { prediction };

  return {
    prediction,
    featureIndex: best.featureIndex,
    threshold: best.threshold,
    left: buildTree(best.left, depth + 1, options, rng),
    right: buildTree(best.right, depth + 1, options, rng),
  };
};

const predictTree = (tree, vector) => {
  if (tree.featureIndex == null) return tree.prediction;
  return vector[tree.featureIndex] < tree.threshold
    ? predictTree(tree.left, vector)
    : predictTree(tree.right, vector);
};

export const trainRandomForest = (rows, options = {}) => {
  const samples = rows.map((row) => ({
    x: makeFeatureVector(row.features),
    y: Number(row.label.finalPercent),
  }));
  const minimumRows = options.minRows || MIN_RANDOM_FOREST_ROWS;
  if (samples.length < minimumRows) return null;

  const config = {
    treeCount: options.treeCount || 40,
    maxDepth: options.maxDepth || 6,
    minSamplesSplit: options.minSamplesSplit || 3,
    featureCount: FEATURE_NAMES.length,
    seed: options.seed || 42,
  };
  const rng = mulberry32(config.seed);
  const trees = Array.from({ length: config.treeCount }, () => {
    const bag = sampleIndexes(samples.length, rng).map((index) => samples[index]);
    return buildTree(bag, 0, config, rng);
  });

  return {
    algorithm: "RandomForestRegressor",
    featureNames: FEATURE_NAMES,
    trainedAt: new Date().toISOString(),
    sampleCount: samples.length,
    config,
    trees,
  };
};

export const predictWithModel = (model, features) => {
  if (!model?.trees?.length) return null;
  const vector = makeFeatureVector(features);
  const predictions = model.trees.map((tree) => predictTree(tree, vector));
  const predictedPercent = round(mean(predictions), 1);
  return {
    predictedPercent,
    riskCategory: riskCategoryForPercent(predictedPercent),
  };
};

export const heuristicPrediction = (features) => {
  const predictedPercent = round(
    weightedMean([
      { value: features.weightedExamPercent, weight: 5 },
      { value: features.latestExamPercent, weight: 4 },
      { value: features.quizPercent, weight: 2 },
      { value: features.classAttendancePercent, weight: 1.5 },
      { value: features.weightedExamAttendanceScore, weight: 1.5 },
    ]),
    1,
  );
  return {
    predictedPercent,
    riskCategory: riskCategoryForPercent(predictedPercent),
  };
};

export const saveDataset = async (rows, targetPath = DATASET_PATH) => {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, JSON.stringify(rows, null, 2));
  return targetPath;
};

export const saveModel = async (model, targetPath = MODEL_PATH) => {
  if (!model) return null;
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, JSON.stringify(model, null, 2));
  return targetPath;
};

export const loadSavedModel = async () => {
  try {
    const content = await fs.readFile(MODEL_PATH, "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
};

export const getStudentPerformancePrediction = async (studentId) => {
  const student = await Student.findById(studentId).populate("facultyId");
  if (!student || !student.facultyId) return null;

  const { features, metadata } = await buildStudentPerformanceFeatures({
    student,
    facultyId: student.facultyId._id,
    level: student.current_level,
    batch: student.admitted_batch,
  });
  const dataset = await buildLabelledPerformanceDataset({
    facultyId: student.facultyId._id,
    level: student.current_level,
    batch: student.admitted_batch,
  });
  const trainedModel = trainRandomForest(dataset);
  const savedModel = await loadSavedModel();
  const usableSavedModel =
    savedModel?.sampleCount >= MIN_RANDOM_FOREST_ROWS ? savedModel : null;
  const model = trainedModel || usableSavedModel;
  const modelPrediction = predictWithModel(model, features);
  const fallback = heuristicPrediction(features);
  const hasCompletedExamMarks = Number(features.completedExamCount || 0) > 0;
  const prediction = hasCompletedExamMarks ? modelPrediction || fallback : null;
  const knnRows =
    dataset.length >= DEFAULT_MIN_ROWS ? dataset : await buildLabelledPerformanceDataset();
  const knnModel = trainKnnClassifier(knnRows, FEATURE_NAMES, {
    k: DEFAULT_K,
    minRows: DEFAULT_MIN_ROWS,
  });
  const knnPrediction = predictWithKnn(knnModel, features);

  return {
    available: Boolean(prediction?.predictedPercent != null),
    algorithm: hasCompletedExamMarks
      ? modelPrediction
        ? "Random Forest"
        : "Weighted fallback"
      : "Insufficient data",
    trainedSampleCount: model?.sampleCount || dataset.length,
    minimumRandomForestRows: MIN_RANDOM_FOREST_ROWS,
    predictedFinalPercent: prediction?.predictedPercent ?? null,
    riskCategory: prediction?.riskCategory || { label: "Unavailable", color: "gray" },
    features,
    metadata,
    knnClassification: {
      available: Boolean(knnPrediction),
      algorithm: "K-Nearest Neighbors",
      trainedSampleCount: knnModel?.sampleCount || knnRows.length,
      k: DEFAULT_K,
      riskCategory: knnPrediction?.riskCategory || null,
      confidencePercent: knnPrediction?.confidencePercent ?? null,
      note: knnPrediction
        ? "KNN classifies the risk category by comparing this student with the nearest labelled academic records."
        : `Only ${knnRows.length} labelled rows are available. KNN needs at least ${DEFAULT_MIN_ROWS}.`,
    },
    note: hasCompletedExamMarks
      ? modelPrediction
        ? "Prediction is generated from labelled rows built from existing semester records."
        : `Only ${dataset.length} labelled rows are available. Random Forest needs at least ${MIN_RANDOM_FOREST_ROWS}, so a weighted fallback was used.`
      : "Final score prediction will appear after at least one current semester exam mark is entered.",
  };
};

export { DATASET_PATH, MODEL_PATH, FEATURE_NAMES };
