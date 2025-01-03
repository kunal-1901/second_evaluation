const express = require("express");

const userMiddleware = require("../middleware/userMiddleware.js");

const {
    saveForm,
    getUserForms,
    getFormById,
    deleteForm,
    shareForm,
    getPublicForm,
    getFormDetails,
  } = require("../Controller/formController.js");

  const {
    saveFormResponse,
    getFormResponses,
    savePublicFormResponse,
  } = require("../Controller/formResponseController.js");

const router = express.Router();


router.get("/form/:formId", userMiddleware, getFormDetails);
router.put("/form/:formId", userMiddleware, saveForm);
router.get("/getUserForms", userMiddleware, getUserForms);
router.get("/getFormById/:formId", userMiddleware, getFormById);
router.delete("/deleteForm/:formId", userMiddleware, deleteForm);
router.post("/share/:formId", userMiddleware, shareForm);
router.get("/public/:shareToken", getPublicForm);
router.post("/public/:shareToken/responses", savePublicFormResponse);
router.post("/formsbot/:formId/responses", saveFormResponse);
router.get("/formsbot/:formId/responses", userMiddleware, getFormResponses);
router.get("/forms/:formId/stats", userMiddleware, async (req, res) => {
  try {
    const stats = await getFormStats(req.params.formId); // Ensure this is defined
    res.json({ success: true, stats });
  } catch (error) {
    console.error("Error fetching form stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching form stats",
      error: error.message,
    });
  }
});

router.post("/forms/:formId/view", async (req, res) => {
  try {
    const stats = await incrementFormView(
      req.params.formId,
      req.user?.id, // User ID (if logged in)
      req.ip // IP address
    );
    res.json({ success: true, stats });
  } catch (error) {
    console.error("Error recording form view:", error);
    res.status(500).json({
      success: false,
      message: "Error recording form view",
      error: error.message,
    });
  }
});


module.exports = router;