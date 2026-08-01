import { Student } from "../models/student.model.js";
import { ClassOffering } from "../models/classOffering.model.js";
import {
  FEATURE_NAMES,
  buildLabelledPerformanceDataset,
  buildStudentPerformanceFeatures,
  heuristicPrediction,
  loadSavedModel,
  predictWithModel,
  trainRandomForest,
} from "./performancePrediction.js";
import { DEFAULT_K, DEFAULT_MIN_ROWS, predictWithKnn, trainKnnClassifier } from "./performanceKnn.js";

const MIN_RANDOM_FOREST_ROWS = 12;

const normalizeFaculty = (faculty) => ({
  id: faculty?._id?.toString?.() || "",
  code: faculty?.faculty_code || "",
  name: faculty?.faculty_name || "",
});

const fullName = (student) =>
  [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ");

const keepNewestBatchPerLevel = (groups) => {
  const latest = new Map();
  groups.forEach((group) => {
    const key = `${group.facultyId}-${group.level}`;
    if (!latest.has(key) || Number(group.batch) > Number(latest.get(key).batch)) latest.set(key, group);
  });
  return [...latest.values()];
};

const getClassGroups = async ({ scope, teacherId, facultyId, level, batch }) => {
  const filter = { isActive: true };
  if (scope === "teacher") filter.teacherId = teacherId;
  if (facultyId) filter.facultyId = facultyId;
  if (level) filter.level = Number(level);
  if (batch) filter.batch = Number(batch);

  const offerings = await ClassOffering.find(filter).populate("facultyId").populate("subjectId");
  const groups = new Map();
  offerings.forEach((offering) => {
    const faculty = normalizeFaculty(offering.facultyId);
    const key = classKey({ facultyId: faculty.id, level: offering.level, batch: offering.batch });
    if (!groups.has(key)) {
      groups.set(key, {
        facultyId: faculty.id,
        faculty,
        level: Number(offering.level),
        batch: Number(offering.batch),
        subjects: [],
      });
    }
    if (scope === "teacher") {
      groups.get(key).subjects.push({
        id: offering.subjectId?._id?.toString?.() || "",
        code: offering.subjectId?.subject_code || "",
        name: offering.subjectId?.subject_name || "Subject",
      });
    }
  });
  return batch ? [...groups.values()] : keepNewestBatchPerLevel([...groups.values()]);
};

const getDashboardScope = async ({ scope, teacherId, facultyId, level, batch }) => {
  const groups = await getClassGroups({ scope, teacherId, facultyId, level, batch });
  if (!groups.length) return { students: [], groups };

  const students = await Student.find({
    isActive: true,
    academic_status: { $ne: "graduated" },
    $or: groups.map((group) => ({
      facultyId: group.facultyId,
      current_level: group.level,
      admitted_batch: group.batch,
    })),
  })
    .populate("facultyId")
    .sort({ current_level: 1, admitted_batch: -1, roll_no: 1 });
  return { students, groups };
};

const buildActiveClasses = (students) => {
  const groups = new Map();
  students.forEach((student) => {
    const faculty = normalizeFaculty(student.facultyId);
    const key = classKey({ facultyId: faculty.id, level: student.current_level, batch: student.admitted_batch });
    if (!groups.has(key)) {
      groups.set(key, {
        faculty,
        level: Number(student.current_level),
        batch: Number(student.admitted_batch),
        studentCount: 0,
      });
    }
    groups.get(key).studentCount += 1;
  });
  return [...groups.values()];
};

const CATEGORY_DETAILS = {
  "At Risk": { color: "red", description: "Predicted to need immediate academic support." },
  Average: { color: "yellow", description: "Predicted to have an average final result with room to improve." },
  Good: { color: "blue", description: "Predicted to achieve a good final result." },
  Excellent: { color: "green", description: "Predicted to achieve an excellent final result." },
};

const classKey = ({ facultyId, level, batch }) => `${facultyId}-${Number(level)}-${Number(batch)}`;
const round = (value, places = 2) => Number(Number(value || 0).toFixed(places));

const compareStudents = (a, b, label) => {
  const direction = label === "At Risk" ? 1 : -1;
  return direction * (Number(a.prediction.predictedFinalPercent || 0) - Number(b.prediction.predictedFinalPercent || 0));
};

export const buildPredictionDashboard = async ({ scope, teacherId, facultyId, level, batch }) => {
  const { students: studentDocuments, groups } = await getDashboardScope({ scope, teacherId, facultyId, level, batch });
  const rows = studentDocuments.map((student) => ({
    studentId: student._id.toString(),
    studentCode: student.std_id,
    name: fullName(student),
    faculty: normalizeFaculty(student.facultyId),
    level: Number(student.current_level),
    batch: Number(student.admitted_batch),
  }));
  const dashboardScope = {
    trainedSampleCount: rows.length,
    activeClasses: buildActiveClasses(studentDocuments),
    scope,
    teacherGroups: groups,
  };
  if (!rows.length) {
    return {
      ...dashboardScope,
      algorithm: "Random Forest Prediction and KNN Classification",
      featureNames: FEATURE_NAMES,
      clusters: [],
      students: [],
    };
  }

  const studentsById = new Map(studentDocuments.map((student) => [student._id.toString(), student]));
  const savedModel = await loadSavedModel();
  const usableSavedModel = savedModel?.sampleCount >= MIN_RANDOM_FOREST_ROWS ? savedModel : null;
  const contexts = new Map();
  let globalRowsPromise = null;

  const getContext = async (row) => {
    const key = classKey({ facultyId: row.faculty.id, level: row.level, batch: row.batch });
    if (contexts.has(key)) return contexts.get(key);

    const dataset = await buildLabelledPerformanceDataset({
      facultyId: row.faculty.id,
      level: row.level,
      batch: row.batch,
    });
    const randomForest = trainRandomForest(dataset) || usableSavedModel;
    let knnRows = dataset;
    if (knnRows.length < DEFAULT_MIN_ROWS) {
      globalRowsPromise ||= buildLabelledPerformanceDataset();
      knnRows = await globalRowsPromise;
    }
    const knn = trainKnnClassifier(knnRows, FEATURE_NAMES, { k: DEFAULT_K, minRows: DEFAULT_MIN_ROWS });
    const context = { randomForest, knn };
    contexts.set(key, context);
    return context;
  };

  const students = [];
  for (const row of rows) {
    const student = studentsById.get(row.studentId);
    if (!student?.facultyId) continue;
    const [{ features }, context] = await Promise.all([
      buildStudentPerformanceFeatures({
        student,
        facultyId: student.facultyId._id,
        level: student.current_level,
        batch: student.admitted_batch,
      }),
      getContext(row),
    ]);
    const randomForestPrediction = predictWithModel(context.randomForest, features);
    const prediction = randomForestPrediction || heuristicPrediction(features);
    const knnPrediction = predictWithKnn(context.knn, features);
    const category = knnPrediction?.riskCategory || prediction.riskCategory;

    students.push({
      ...row,
      features,
      prediction: {
        predictedFinalPercent: prediction.predictedPercent,
        riskCategory: prediction.riskCategory,
        algorithm: randomForestPrediction ? "Random Forest" : "Weighted fallback",
      },
      knnClassification: knnPrediction,
      cluster: category,
    });
  }

  const clusters = Object.entries(CATEGORY_DETAILS)
    .map(([label, detail]) => {
      const members = students
        .filter((student) => student.cluster?.label === label)
        .sort((a, b) => compareStudents(a, b, label));
      if (!members.length) return null;
      return {
        clusterId: label,
        label,
        ...detail,
        count: members.length,
        averageFeatures: {
          predictedFinalPercent: round(members.reduce((sum, student) => sum + Number(student.prediction.predictedFinalPercent || 0), 0) / members.length),
          classAttendancePercent: round(members.reduce((sum, student) => sum + Number(student.features.classAttendancePercent || 0), 0) / members.length),
          knnConfidencePercent: round(members.reduce((sum, student) => sum + Number(student.knnClassification?.confidencePercent || 0), 0) / members.length),
        },
        students: members,
      };
    })
    .filter(Boolean);

  const categoryOrder = Object.keys(CATEGORY_DETAILS);
  students.sort((a, b) => {
    const groupDifference = categoryOrder.indexOf(a.cluster?.label) - categoryOrder.indexOf(b.cluster?.label);
    return groupDifference || compareStudents(a, b, a.cluster?.label);
  });

  return {
    ...dashboardScope,
    algorithm: "Random Forest Prediction and KNN Classification",
    featureNames: FEATURE_NAMES,
    clusters,
    students,
  };
};
