const mongoose = require("mongoose");
const User = require("../models/User");
const connectDB = require("../config/db");

const resetSuperAdmin = async () => {
  await connectDB();
  const user = await User.findOne({ email: "ubaidprimarycare@gmail.com" });
  const password = process.env.SUPERADMIN_DEV_PASSWORD || "passwordprimarycare";

  if (user) {
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.password = password;
    await user.save();
    console.log("SuperAdmin unlocked and password reset.");
    console.log(`Email   : ${user.email}`);
    console.log(`Password: ${password}`);
  } else {
    console.log("SuperAdmin not found.");
  }

  await mongoose.connection.close();
  process.exit(0);
};

resetSuperAdmin().catch(console.error);
