import dotenv from "dotenv";
import mongoose from "mongoose";
import { DB_NAME } from "../src/constants.js";
import { Student } from "../src/models/student.model.js";
import { Teacher } from "../src/models/teacher.model.js";

dotenv.config();

const requestedNames = [
  "Ureka Gautam", "Milli Rai", "Rupak Olee", "Bishal Panta", "Bishal Gautam",
  "Joshna Gurung", "Rakib Rehman", "Manish Thapa", "Nishan Nakarmi", "Nischal Shrestha",
  "Shahil Hussian", "Sudip Adhikari", "Chandra Narayan Chaudhary", "Binita Magar",
  "Roshni Shrestha", "Sudiccha Shrestha", "Pukar Subedi", "Subash Subedi", "Saugat Basnet",
  "Anisha Aryal", "Nikesh Adhikari", "Bodhan Dhakal", "Prasuna Shretha", "Kritika Dhital",
  "Raj Panday", "Bepin Thapa", "Ankit Chaudhary", "Nishan Gurung", "Binod Thapa", "Pradeep Pokhrel",
  "Swastika Pokhrel", "Sandhiya Reezal", "Alisha Kafle", "Esha Shrestha", "Anamika Dangol",
  "Sujata Basnet", "Suyana Bhandari", "Jyoti Chhetri", "Jyoti Shrestha", "Sugam Pokhrel",
  "Prabin Adhikari", "Binod Pokhrel", "Abishek Bhandari", "Rojan Shahi Thakuri", "Summer Shrestha", "Prabina Magar",
];

const firstNames = [
  "Aastha", "Aayush", "Abhinav", "Aditi", "Anmol", "Anusha", "Arjun", "Bikash", "Bina", "Chetan",
  "Chandani", "Dipesh", "Dikshya", "Elina", "Eshan", "Gaurav", "Hema", "Ishwor", "Kabita", "Kiran",
  "Kusum", "Manisha", "Nabin", "Nikita", "Pranjal", "Rachana", "Rijan", "Saksham", "Sanjana", "Suman",
];
const surnames = [
  "Acharya", "Bajracharya", "Bhandari", "Bista", "Dahal", "Ghimire", "Joshi", "Kandel", "Khadka", "Koirala",
  "Lama", "Maharjan", "Neupane", "Poudel", "Rijal", "Shahi", "Tamang", "Thapa", "Yadav", "KC",
];

const teacherNames = [
  "Ramila Subedi", "Sabin Silwal", "Amrit Gautam", "Nirmala Shahi", "Prakash Bista",
  "Sita Adhikari", "Bikash Khatri", "Ramesh Koirala", "Sanjay Koirala", "Kritika Koirala",
  "Sagar Bhattarai", "Pooja Pandey", "Milan Joshi", "Ritu Shrestha", "Dinesh Poudel",
];

const makeUniqueNames = (count) => {
  const used = new Set();
  const names = [];
  [...requestedNames, ...surnames.flatMap((surname) => firstNames.map((firstName) => `${firstName} ${surname}`))]
    .forEach((name) => {
      const key = name.toLowerCase();
      if (!used.has(key) && names.length < count) {
        used.add(key);
        names.push(name);
      }
    });
  if (names.length < count) throw new Error("Not enough unique identity names configured");
  return names;
};

const splitName = (name) => {
  const parts = name.trim().split(/\s+/);
  return {
    firstName: parts[0],
    middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    lastName: parts.at(-1),
  };
};

const usernameFor = ({ firstName, lastName }, index) =>
  `${firstName}.${lastName}.${String(index + 1).padStart(3, "0")}`.toLowerCase();

const databaseUri = () => {
  const baseUri = process.env.MONGODB_URI || "";
  if (!baseUri) throw new Error("MONGODB_URI is not configured");
  const uri = new URL(baseUri);
  uri.pathname = `/${DB_NAME}`;
  return uri.toString();
};

try {
  await mongoose.connect(databaseUri());

  const students = await Student.find({ std_id: /^DEMO-ML-\d+$/ }).sort({ std_id: 1 });
  const names = makeUniqueNames(students.length);

  for (const [index, student] of students.entries()) {
    const identity = splitName(names[index]);
    const username = usernameFor(identity, index);
    await Student.updateOne(
      { _id: student._id },
      {
        $set: {
          first_name: identity.firstName,
          middle_name: identity.middleName,
          last_name: identity.lastName,
          username,
          email: `${username}@student.college.edu.np`,
          mobile_no: `980${String(1000000 + index).slice(-7)}`,
          guardian_name: `Guardian ${identity.lastName}`,
          guardian_mobile: `981${String(1000000 + index).slice(-7)}`,
        },
      },
    );
  }

  const teachers = await Teacher.find({ $or: [{ username: /^demo\./ }, { email: /@examify\.local$/ }] }).sort({ email: 1 });
  for (const [index, teacher] of teachers.entries()) {
    const identity = splitName(teacherNames[index] || `Faculty ${index + 1}`);
    const username = usernameFor(identity, index);
    await Teacher.updateOne(
      { _id: teacher._id },
      {
        $set: {
          first_name: identity.firstName,
          middle_name: identity.middleName,
          last_name: identity.lastName,
          username,
          email: `${username}@college.edu.np`,
          mobile_no: `982${String(1000000 + index).slice(-7)}`,
          address: "Kathmandu, Nepal",
        },
      },
    );
  }

  console.log(`Updated identity fields for ${students.length} students and ${teachers.length} teachers in ${DB_NAME}.`);
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
