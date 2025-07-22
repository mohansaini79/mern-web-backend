const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ✅ SIGNUP
exports.signup = async (req, res) => {
  const { name, email, password } = req.body;

  // 🔐 Server-side Validation
  if (!name || !email || !password) {
    return res.status(400).json({ msg: "All fields are required" });
  }

  const nameRegex = /^[A-Za-z\s]+$/;
  if (!nameRegex.test(name)) {
    return res.status(400).json({ msg: "Name must contain only letters and spaces" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ msg: "Invalid email format" });
  }

  // ✅ Strong password regex
  
 if(password.length < 8){
  alert("Password must be at least 8 characters");
  return;
 }

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ msg: "User already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed });
    await user.save();

    res.status(201).json({ msg: "Signup successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ LOGIN
exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ msg: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d", // Optional: Token expiry
    });

    res.json({ token, user: { id: user._id, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ GOOGLE LOGIN
exports.googleLogin = async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ name, email, password: "" }); // No password needed for Google login
      await user.save();
    }

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token: jwtToken, user: { id: user._id, name: user.name } });

  } catch (err) {
    res.status(400).json({ msg: "Google Login Failed", error: err.message });
  }
};
