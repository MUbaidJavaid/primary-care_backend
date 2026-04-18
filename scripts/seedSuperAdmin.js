const bcrypt = require("bcryptjs");
const User = require("../models/User");

const seedSuperAdmin = async () => {
  const existing = await User.findOne({ role: "superadmin" });
  if (existing) {
    console.log("SuperAdmin already exists. Skipping seed.");
    return;
  }

  const hashedPassword = await bcrypt.hash("passwordprimarycare", 12);

  await User.create({
    name: "Super Administrator",
    email: "ubaidprimarycare@gmail.com",
    password: hashedPassword,
    role: "superadmin",
    facility: null,
    permissions: ["*"],
    isActive: true,
    isEmailVerified: true,
    profile: {
      designation: "System Administrator",
      organization: "Primary Care Triage Pakistan",
    },
    createdAt: new Date(),
  });

  console.log("SuperAdmin seeded successfully!");
  console.log("Email   : ubaidprimarycare@gmail.com");
  console.log("Password: passwordprimarycare");
  console.log("CHANGE PASSWORD AFTER FIRST LOGIN!");
};

module.exports = seedSuperAdmin;
