const jwt = require("jsonwebtoken");
require("dotenv").config();

// Middleware to verify JWT token
exports.auth = async (req, res, next) => {
  try {
    // Get token from cookies, body, or Authorization header
    const token =
      req.cookies?.jwt ||
      req.body?.token ||
      req.header("Authorization")?.replace("Bearer ", "");

    console.log("Token of userrr:", token);

    // If token is missing
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token missing",
      });
    }

    try {
      // Verify the token and attach payload to req.user
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = payload;
      console.log("User type:", req.user.accountType);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Token is invalid",
      });
    }

    next(); // Proceed to next middleware
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error in auth middleware",
    });
  }
};

// Middleware to check if user is a Student
exports.isStudent = async (req, res, next) => {
  try {
    if (req.user.accountType !== "Student") {
      return res.status(403).json({
        success: false,
        message: "Access denied: You are not a Student.",
      });
    }

    next(); // User is a Student
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error in isStudent middleware",
    });
  }
};

// Middleware to check if user is an Instructor
exports.isInstructor = async (req, res, next) => {
  try {
    if (req.user.accountType !== "Instructor") {
      return res.status(403).json({
        success: false,
        message: "Access denied: You are not an Instructor.",
      });
    }

    next(); // User is an Instructor
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error in isInstructor middleware",
    });
  }
};

// Middleware to check if user is an Admin
exports.isAdmin = async (req, res, next) => {
  try {
    if (req.user.accountType !== "Admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied: You are not an Admin.",
      });
    }

    next(); // User is an Admin
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error in isAdmin middleware",
    });
  }
};
