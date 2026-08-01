import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Admin } from "../src/models/admin.model.js";
import { Attendance } from "../src/models/attendance.model.js";
import { ClassAttendanceSession } from "../src/models/classAttendanceSession.model.js";
import { ClassOffering } from "../src/models/classOffering.model.js";
import { Exam } from "../src/models/exam.model.js";
import { ExamAttendance } from "../src/models/examAttendance.model.js";
import { Faculty } from "../src/models/faculty.model.js";
import { Marks } from "../src/models/marks.model.js";
import { Quiz } from "../src/models/quiz.model.js";
import { QuizSubmission } from "../src/models/quizSubmission.model.js";
import { Student } from "../src/models/student.model.js";
import { Subject } from "../src/models/subject.model.js";
import { Teacher } from "../src/models/teacher.model.js";
import connectDB from "../src/db/index.js";

dotenv.config();

const password = "Demo@123";
const optionLabels = ["A", "B", "C", "D"];
const STUDENTS_PER_GROUP = 60;

const groups = [
  { code: "BCA", name: "Bachelor of Computer Applications", structure: "semester", maxLevel: 8, level: 1, batch: 2026 },
  { code: "BCA", name: "Bachelor of Computer Applications", structure: "semester", maxLevel: 8, level: 2, batch: 2025 },
  { code: "BBM", name: "Bachelor of Business Management", structure: "semester", maxLevel: 8, level: 1, batch: 2026 },
  { code: "BBM", name: "Bachelor of Business Management", structure: "semester", maxLevel: 8, level: 2, batch: 2025 },
  { code: "BBS", name: "Bachelor of Business Studies", structure: "year", maxLevel: 4, level: 1, batch: 2026 },
];

const subjectTemplates = {
  BCA: [
    ["Programming Fundamentals", "PF"],
    ["Mathematics", "MTH"],
    ["Digital Logic", "DL"],
  ],
  BBM: [
    ["Principles of Management", "POM"],
    ["Business Mathematics", "BM"],
    ["Financial Accounting", "FA"],
  ],
  BBS: [
    ["Business English", "BEN"],
    ["Accountancy", "ACC"],
    ["Economics", "ECO"],
  ],
};

const requestedStudentNames = [
  [
    "Ureka Gautam", "Milli Rai", "Rupak Olee", "Bishal Panta", "Bishal Gautam",
    "Joshna Gurung", "Rakib Rehman", "Manish Thapa", "Nishan Nakarmi", "Nischal Shrestha",
    "Shahil Hussian", "Sudip Adhikari", "Chandra Narayan Chaudhary", "Binita Magar",
    "Roshni Shrestha", "Sudiccha Shrestha", "Pukar Subedi", "Subash Subedi", "Saugat Basnet",
  ],
  [
    "Anisha Aryal", "Nikesh Adhikari", "Bodhan Dhakal", "Prasuna Shretha", "Kritika Dhital",
    "Raj Panday", "Bepin Thapa", "Ankit Chaudhary", "Nishan Gurung", "Binod Thapa", "Pradeep Pokhrel",
  ],
  [],
  [],
  [
    "Jyoti Chhetri", "Jyoti Shrestha", "Sugam Pokhrel", "Prabin Adhikari", "Binod Pokhrel",
    "Abishek Bhandari", "Rojan Shahi Thakuri", "Summer Shrestha", "Prabina Magar",
    "Swastika Pokhrel", "Sandhiya Reezal", "Alisha Kafle", "Esha Shrestha", "Anamika Dangol",
    "Sujata Basnet", "Suyana Bhandari",
  ],
];

const generatedFirstNames = [
  "Aastha", "Aayush", "Abhinav", "Aditi", "Alisha", "Anmol", "Anusha", "Arjun",
  "Bikash", "Bina", "Chetan", "Dikshya", "Dipesh", "Elina", "Eshan", "Gaurav",
  "Hema", "Ishwor", "Kabita", "Kiran", "Manisha", "Nabin", "Nikita", "Pranjal",
  "Rachana", "Rijan", "Saksham", "Sanjana", "Suman", "Tika",
];
const generatedLastNames = [
  "Acharya", "Bajracharya", "Bhandari", "Bista", "Dahal", "Ghimire", "Joshi", "Kandel",
  "Khadka", "Koirala", "Lama", "Maharjan", "Neupane", "Poudel", "Rijal", "Shahi",
  "Shrestha", "Tamang", "Thapa", "Yadav",
];

const splitName = (name) => {
  const parts = name.split(" ");
  return {
    firstName: parts[0],
    middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    lastName: parts.at(-1),
  };
};

const buildStudentNames = () => {
  const used = new Set();
  const generated = generatedLastNames.flatMap((lastName) =>
    generatedFirstNames.map((firstName) => `${firstName} ${lastName}`),
  );
  let generatedIndex = 0;
  return groups.map((group, groupIndex) =>
    Array.from({ length: STUDENTS_PER_GROUP }, (_, index) => {
      const requested = requestedStudentNames[groupIndex]?.[index];
      if (requested) {
        used.add(requested.toLowerCase());
        return requested;
      }
      while (used.has(generated[generatedIndex].toLowerCase())) generatedIndex += 1;
      const nextName = generated[generatedIndex];
      generatedIndex += 1;
      used.add(nextName.toLowerCase());
      return nextName;
    }),
  );
};

const studentNamesByGroup = buildStudentNames();

const teacherNamesBySubject = {
  BCA1PF: "Sabin Silwal",
  BCA1MTH: "Amrit Gautam",
  BCA1DL: "Nirmala Shahi",
  BCA2PF: "Sabin Silwal",
  BCA2MTH: "Amrit Gautam",
  BCA2DL: "Prakash Bista",
  BBM1POM: "Sita Adhikari",
  BBM1BM: "Amrit Gautam",
  BBM1FA: "Bikash Khatri",
  BBM2POM: "Sita Adhikari",
  BBM2BM: "Amrit Gautam",
  BBM2FA: "Bikash Khatri",
  BBS1BEN: "Ramila Subedi",
  BBS1ACC: "Bikash Khatri",
  BBS1ECO: "Ramesh Koirala",
};
const teacherNames = [...new Set(Object.values(teacherNamesBySubject))];

const levels = (group) =>
  Array.from({ length: group.maxLevel }, (_, index) => ({
    value: index + 1,
    label:
      group.structure === "semester"
        ? `${ordinal(index + 1)} Semester`
        : `${ordinal(index + 1)} Year`,
  }));

const ordinal = (value) => {
  const suffix = value === 1 ? "First" : value === 2 ? "Second" : value === 3 ? "Third" : `${value}th`;
  return suffix;
};

const dateAt = (day) => new Date(Date.UTC(2026, 0, day, 4, 0, 0));

const scoreProfile = (index, groupIndex) => {
  const wave = (index * 17 + groupIndex * 11) % 70;
  const base = 25 + wave;
  const bandBoost = index % 9 === 0 ? 8 : index % 7 === 0 ? -7 : 0;
  return Math.max(18, Math.min(97, base + bandBoost));
};

const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const ensureFaculty = async (group) => {
  const update = {
    faculty_code: group.code,
    faculty_name: group.name,
    structure: group.structure,
    max_level: group.maxLevel,
    levels: levels(group),
    isDeleted: false,
  };
  return Faculty.findOneAndUpdate(
    { faculty_code: group.code },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

const ensureTeacher = async (facultyCode, subjectCode, subjectName, hash) => {
  const fullName = teacherNamesBySubject[subjectCode] || "Sanjay Koirala";
  const { firstName, middleName, lastName } = splitName(fullName);
  const username = fullName.toLowerCase().replaceAll(" ", ".");
  const teacherIndex = Math.max(0, teacherNames.indexOf(fullName));
  const legacyEmail = `demo.${facultyCode.toLowerCase()}.${subjectCode.toLowerCase()}@examify.local`;
  return Teacher.findOneAndUpdate(
    {
      $or: [
        { email: `${username}@college.edu.np` },
        { email: legacyEmail },
      ],
    },
    {
      $set: {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        mobile_no: `9801${String(100000 + teacherIndex).slice(-6)}`,
        address: "Kathmandu, Nepal",
        username,
        password: hash,
        plain_password: password,
        isActive: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

const ensureSubjectsAndOfferings = async ({ faculty, group, hash }) => {
  const subjects = [];
  const offerings = [];

  for (const [name, code] of subjectTemplates[group.code]) {
    const subjectCode = `${group.code}${group.level}${code}`;
    const subject = await Subject.findOneAndUpdate(
      { facultyId: faculty._id, level: group.level, subject_code: subjectCode },
      {
        $set: {
          subject_name: name,
          subject_code: subjectCode,
          facultyId: faculty._id,
          level: group.level,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    const teacher = await ensureTeacher(group.code, subjectCode, name, hash);
    const offering = await ClassOffering.findOneAndUpdate(
      {
        facultyId: faculty._id,
        level: group.level,
        batch: group.batch,
        subjectId: subject._id,
      },
      {
        $set: {
          teacherId: teacher._id,
          startDate: dateAt(1),
          endDate: dateAt(120),
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    subjects.push(subject);
    offerings.push({ offering, subject, teacher });
  }

  return { subjects, offerings };
};

const ensureStudents = async ({ faculty, group, hash, groupIndex }) => {
  const students = [];
  for (let index = 0; index < STUDENTS_PER_GROUP; index += 1) {
    const serial = groupIndex * STUDENTS_PER_GROUP + index + 1;
    const { firstName, middleName, lastName } = splitName(studentNamesByGroup[groupIndex][index]);
    const studentCode = `DEMO-ML-${String(serial).padStart(3, "0")}`;
    const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    const student = await Student.findOneAndUpdate(
      { std_id: studentCode },
      {
        $set: {
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          facultyId: faculty._id,
          current_level: group.level,
          admitted_batch: group.batch,
          academic_status: "active",
          roll_no: index + 1,
          mobile_no: `98${String(40000000 + serial).padStart(8, "0")}`,
          email: `${username}@student.college.edu.np`,
          gender: index % 2 === 0 ? "female" : "male",
          blood_group: ["A+", "B+", "O+", "AB+"][index % 4],
          guardian_name: `Guardian ${lastName}`,
          guardian_mobile: `97${String(50000000 + serial).padStart(8, "0")}`,
          username,
          password: hash,
          plain_password: password,
          isActive: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    students.push({ student, ability: scoreProfile(index, groupIndex) });
  }
  return students;
};

const ensureExams = async ({ faculty, group, subjects }) => {
  const titles = [
    "First Terminal Examination",
    "Second Terminal Examination",
    "Pre-Board Examination",
    "Final Examination",
  ];
  const exams = [];

  for (let index = 0; index < titles.length; index += 1) {
    const items = subjects.map((subject, subjectIndex) => ({
      subjectId: subject._id,
      examDate: dateAt(20 + index * 25 + subjectIndex),
      examTime: "10:00",
    }));
    const exam = await Exam.findOneAndUpdate(
      {
        facultyId: faculty._id,
        level: group.level,
        batch: group.batch,
        title: titles[index],
      },
      {
        $set: {
          fullMarks: 100,
          published: false,
          items,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    exams.push(exam);
  }

  return exams;
};

const seedClassAttendance = async ({ faculty, group, students, offering, teacher }) => {
  for (let day = 1; day <= 20; day += 1) {
    const date = dateAt(day);
    let presentCount = 0;

    for (const { student, ability } of students) {
      const attendanceRate = clamp(ability + 4 - (day % 5), 35, 98);
      const present = ((ability * 13 + day * 7) % 100) < attendanceRate;
      if (present) presentCount += 1;
      await Attendance.findOneAndUpdate(
        {
          studentId: student._id,
          facultyId: faculty._id,
          level: group.level,
          batch: group.batch,
          date,
        },
        {
          $set: {
            classOfferingId: offering._id,
            status: present ? "present" : "absent",
            markedBy: teacher._id,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }

    await ClassAttendanceSession.findOneAndUpdate(
      { facultyId: faculty._id, level: group.level, batch: group.batch, date },
      {
        $set: {
          classOfferingId: offering._id,
          totalStudents: students.length,
          presentCount,
          markedBy: teacher._id,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
};

const seedExamAttendanceAndMarks = async ({ faculty, group, students, offerings, exams, admin }) => {
  for (let examIndex = 0; examIndex < exams.length; examIndex += 1) {
    const exam = exams[examIndex];
    for (const { offering, subject } of offerings) {
      const examItem = exam.items.find(
        (item) => item.subjectId.toString() === subject._id.toString(),
      );
      for (const { student, ability } of students) {
        const attendanceRate = clamp(ability + examIndex * 5, 25, 99);
        const present = ((ability * 11 + examIndex * 17 + student.roll_no * 9) % 100) < attendanceRate;
        await ExamAttendance.findOneAndUpdate(
          {
            examId: exam._id,
            examItemId: examItem._id,
            studentId: student._id,
          },
          {
            $set: {
              subjectId: subject._id,
              facultyId: faculty._id,
              level: group.level,
              batch: group.batch,
              examDate: examItem.examDate,
              status: present ? "present" : "absent",
              markedBy: admin._id,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        if (present) {
          const trendBoost = examIndex * 5;
          const subjectNoise = subject.subject_code.charCodeAt(subject.subject_code.length - 1) % 7;
          const consistency = student.roll_no % 6 === 0 ? -4 : student.roll_no % 5 === 0 ? 3 : 0;
          const obtained = Math.round(
            clamp(ability + trendBoost + subjectNoise + consistency - 7, 12, 99),
          );
          await Marks.findOneAndUpdate(
            {
              studentId: student._id,
              examId: exam._id,
              classOfferingId: offering._id,
            },
            {
              $set: {
                obtained_marks: obtained,
                enteredBy: offering.teacherId,
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true },
          );
        } else {
          await Marks.deleteOne({
            studentId: student._id,
            examId: exam._id,
            classOfferingId: offering._id,
          });
        }
      }
    }
  }
};

const seedQuizzes = async ({ faculty, group, students, offerings, admin }) => {
  for (const { offering, subject, teacher } of offerings.slice(0, 2)) {
    const questions = Array.from({ length: 10 }, (_, index) => ({
      questionText: `${subject.subject_name} demo question ${index + 1}`,
      options: optionLabels.map((label) => ({ label, text: `Option ${label}` })),
      correctOption: optionLabels[index % optionLabels.length],
    }));

    const quiz = await Quiz.findOneAndUpdate(
      { classOfferingId: offering._id, teacherId: teacher._id },
      {
        $set: {
          facultyId: faculty._id,
          level: group.level,
          batch: group.batch,
          subjectId: subject._id,
          title: `${subject.subject_name} Online Quiz`,
          questions,
          status: "published",
          submittedAt: dateAt(84),
          publishedAt: dateAt(85),
          availableFrom: dateAt(86),
          availableUntil: dateAt(87),
          publishedBy: admin._id,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    for (const { student, ability } of students) {
      const submitted = ability >= 45 || student.roll_no % 4 !== 0;
      if (!submitted) continue;
      const obtainedMarks = Math.round(clamp(ability / 10 + (student.roll_no % 3) - 1, 1, 10));
      await QuizSubmission.findOneAndUpdate(
        { quizId: quiz._id, studentId: student._id },
        {
          $set: {
            answers: [],
            obtainedMarks,
            fullMarks: 10,
            status: "submitted",
            submittedAt: dateAt(87),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
  }
};

try {
  await connectDB();
  const admin = await Admin.findOne({ email: "admin@gmail.com" });
  if (!admin) throw new Error("Default admin was not found");
  const hash = await bcrypt.hash(password, 10);

  let studentCount = 0;
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex];
    const faculty = await ensureFaculty(group);
    const { subjects, offerings } = await ensureSubjectsAndOfferings({ faculty, group, hash });
    const students = await ensureStudents({ faculty, group, hash, groupIndex });
    const exams = await ensureExams({ faculty, group, subjects });
    await seedClassAttendance({
      faculty,
      group,
      students,
      offering: offerings[0].offering,
      teacher: offerings[0].teacher,
    });
    await seedExamAttendanceAndMarks({ faculty, group, students, offerings, exams, admin });
    await seedQuizzes({ faculty, group, students, offerings, admin });
    studentCount += students.length;
  }

  console.log(`Seeded ML demo data for ${studentCount} students`);
  console.log("Demo password for generated students/teachers: Demo@123");
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
