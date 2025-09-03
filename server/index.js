const express = require("express");
const app = express();
require("dotenv").config();

// Imports
const dbConnect = require("./config/database");
const { cloudinaryConnect } = require("./config/cloudinary");
const fileUpload = require("express-fileupload");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// Connect to DB and Cloudinary
dbConnect();
cloudinaryConnect();

// Middlewares
app.use(express.json());
app.use(cookieParser());

app.use(cors({
  origin: [
    "http://localhost:3000", 
    "https://studynotion-deploy.onrender.com" // your deployed frontend URL
  ],
  credentials: true,
}));

app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp",
}));

// Routes
const userRoutes = require("./routes/User");
const courseRoutes = require("./routes/Course");
const paymentRoutes = require("./routes/Payments");
const profileRoutes = require("./routes/Profile");
const contactRoutes = require("./routes/Contact");

app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/course", courseRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/reach", contactRoutes);

// Default Route
app.get("/", (req, res) => {
    res.send(`<h1>Welcome to StudyNotion API</h1>`);
});

// Start Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});
