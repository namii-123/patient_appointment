const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true }); // Enable CORS for all origins during development

admin.initializeApp();

exports.resetPassword = functions.https.onCall((data, context) => {
  return cors(data, context, async () => {
    const { token, newPassword } = data;

    // Validate input
    if (!token || !newPassword) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Token and new password are required."
      );
    }

    if (newPassword.length < 6) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Password must be at least 6 characters long."
      );
    }

    try {
      // Check token in Firestore
      const resetDoc = await admin
        .firestore()
        .collection("passwordResets")
        .doc(token)
        .get();

      if (!resetDoc.exists) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid or expired reset token."
        );
      }

      const { email, expiresAt } = resetDoc.data();
      if (expiresAt.toDate() < new Date()) {
        await admin.firestore().collection("passwordResets").doc(token).delete();
        throw new functions.https.HttpsError(
          "invalid-argument",
          "This reset link has expired."
        );
      }

      // Find user by email
      const user = await admin.auth().getUserByEmail(email);
      if (!user) {
        throw new functions.https.HttpsError("not-found", "User not found.");
      }

      // Update password
      await admin.auth().updateUser(user.uid, { password: newPassword });

      // Delete the used token
      await admin.firestore().collection("passwordResets").doc(token).delete();

      return { message: "Password has been reset successfully." };
    } catch (error) {
      console.error("Password reset error:", error);
      throw new functions.https.HttpsError(
        error.code || "internal",
        error.message || "Failed to reset password."
      );
    }
  });
});