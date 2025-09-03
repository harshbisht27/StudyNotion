const { instance } = require("../config/razorpay");
const Users = require("../models/Users");
const Course = require("../models/Course");
const mongoose = require("mongoose");
const { mailSender } = require("../utils/mailSender");
const { courseEnrollmentEmail } = require("../mail/templates/courseEnrollmentEmail");
const crypto = require("crypto");
const { paymentSuccessEmail } = require("../mail/templates/paymentSuccessEmail");
const CourseProgess = require("../models/CourseProgess");

exports.capturePayment = async (req, res) => {
  try {
    const { courses } = req.body;
    const userId = req?.user?.id;

    if (!courses || !userId) {
      return res.status(400).json({
        success: false,
        message: "Please provide courses and valid user ID",
      });
    }

    let totalAmount = 0;

    for (const courseId of courses) {
      const course = await Course.findById(courseId);

      if (!course) {
        return res.status(404).json({ success: false, message: "Course not found" });
      }

      const uid = new mongoose.Types.ObjectId(userId);
      if (course.studentsEnrolled.includes(uid)) {
        return res.status(400).json({ success: false, message: "Already enrolled in course" });
      }

      totalAmount += course.price;
    }

    const options = {
      amount: totalAmount * 100, // amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    };

    const paymentResponse = await instance.orders.create(options);

    return res.status(200).json({
      success: true,
      message: paymentResponse,
    });
  } catch (error) {
    console.error("capturePayment error:", error);
    return res.status(500).json({
      success: false,
      message: "Could not initiate order",
    });
  }
};

exports.verifySignature = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courses,
    } = req.body;

    const userId = req?.user?.id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !courses || !userId) {
      return res.status(400).json({ success: false, message: "Invalid payment data" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    // Enroll students only if signature is valid
    await enrollStudents(courses, userId);

    return res.status(200).json({ success: true, message: "Payment Verified and student enrolled" });
  } catch (error) {
    console.error("verifySignature error:", error);
    return res.status(500).json({ success: false, message: "Payment verification failed" });
  }
};

const enrollStudents = async (courses, userId) => {
  for (const courseId of courses) {
    try {
      // Add student to course
      const enrolledCourse = await Course.findOneAndUpdate(
        { _id: courseId },
        { $push: { studentsEnrolled: userId } },
        { new: true }
      );

      if (!enrolledCourse) {
        throw new Error("Course not found");
      }

      // Create course progress with zero progress
      await CourseProgess.create({
        courseId: courseId,
        userId: userId,
        completedVideos: [],
      });

      // Add course to user's enrolled courses
      const enrolledStudent = await Users.findByIdAndUpdate(
        userId,
        { $push: { courses: courseId } },
        { new: true }
      );

      // Send enrollment email
      await mailSender(
        enrolledStudent.email,
        `Successfully Enrolled into ${enrolledCourse.courseName}`,
        courseEnrollmentEmail(enrolledCourse.courseName, `${enrolledStudent.firstName} ${enrolledStudent.lastName}`)
      );
    } catch (error) {
      console.error("Enrollment error:", error);
      // We do NOT send response here; errors propagate to caller
      throw error;
    }
  }
};

exports.sendPaymentSuccessEmail = async (req, res) => {
  try {
    const { orderId, paymentId, amount } = req.body;
    const userId = req?.user?.id;

    if (!orderId || !paymentId || !amount || !userId) {
      return res.status(400).json({ success: false, message: "Please provide all required fields" });
    }

    const enrolledStudent = await Users.findById(userId);

    await mailSender(
      enrolledStudent.email,
      `Payment Received - StudyNotion`,
      paymentSuccessEmail(
        `${enrolledStudent.firstName} ${enrolledStudent.lastName}`,
        amount / 100,
        orderId,
        paymentId
      )
    );

    return res.status(200).json({ success: true, message: "Payment success email sent" });
  } catch (error) {
    console.error("sendPaymentSuccessEmail error:", error);
    return res.status(500).json({ success: false, message: "Could not send email" });
  }
};
