console.log("Loading FormResponse schema...");
const FormResponse = require("../Schemas/formResponseSchema");
console.log("Loaded FormResponse schema:", FormResponse);
const Form = require("../Schemas/Form");
const FormStat = require("../Schemas/formStatSchema");
const { getFormStats } = require("./formStatsController"); // Correct the path as necessary
require("dotenv").config();

// Save user response to a form
const saveFormResponse = async (req, res) => {
  try {
    const { formId } = req.params;
    const { elementId, elementLabel, response, sessionId } = req.body;
    // const userId = req.user?.id; // Optional user ID
    const ipAddress = req.ip;

    if (!elementId || !elementLabel || !response || !sessionId){
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: elementId, elementLabel, or response",
      });
    }

    // Find existing response session or create new one
    let formResponse = await FormResponse.findOne({
      formId,
      status: { $in: ["started", "in_progress"] }
    });

    if (!formResponse) {
      formResponse = new FormResponse({
        formId,
        sessionId,
        ipAddress,
        responses: [],
        status: "started"
      });
    }

    // Add new response
    formResponse.responses.push({
      elementId,
      elementLabel,
      response,
      timestamp: new Date(),
    });

    formResponse.lastInteractionAt = new Date();
    formResponse.status = "in_progress";
    // Check if this is the last response
    const originalForm = await Form.findById(formId);
    if (originalForm && formResponse.responses.length === originalForm.elements.length) {
      formResponse.status = "completed";
      formResponse.completedAt = new Date();
      
      // Update completion stats
      await FormStat.findOneAndUpdate(
        { formId },
        {
          $inc: { completed: 1 },
          $set: { lastUpdated: new Date() }
        },
        { upsert: true }
      );
    }

    await formResponse.save();

    res.status(200).json({
      success: true,
      formResponse,
    });
  } catch (error) {
    console.error("Error saving form response:", error);
    res.status(500).json({
      success: false,
      message: "Error saving form response",
      error: error.message,
    });
  }
};

// Fetch all responses for a form (admin or creator access required)
const getFormResponses = async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.user.id;

    // Check if the form exists and belongs to the user
    const form = await Form.findOne({ _id: formId, userId });
    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found or unauthorized",
      });
    }

    // Fetch stats and responses
    const stats = await getFormStats(formId); // Ensure this is defined
    const responses = await FormResponse.find({ formId })
      .populate("userId", "name email") // Include user info
      .sort({ startedAt: -1 }); // Sort responses by start time

    res.status(200).json({
      success: true,
      stats,
      responses, // Include the responses for analytics
    });
  } catch (error) {
    console.error("Error fetching form responses:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching form responses",
      error: error.message,
    });
  }
};

const incrementFormView = async (formId, userId, ipAddress) => {
  try {
    const stats = await FormStat.findOneAndUpdate(
      { formId },
      {
        $inc: { views: 1 },
        $push: {
          uniqueViews: {
            userId,
            ipAddress,
            timestamp: new Date()
          }
        },
        $set: { lastUpdated: new Date() }
      },
      { upsert: true, new: true }
    );
    return stats;
  } catch (error) {
    console.error("Error incrementing form view:", error);
    throw error;
  }
};

const savePublicFormResponse = async (req, res) => {
  try {
    const { shareToken } = req.params;
    const { elementId, elementLabel, response, sessionId } = req.body;
    const ipAddress = req.ip;

    // First find the form using the share token
    const form = await Form.findOne({
      shareToken,
      isPublic: true,
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found or not publicly accessible",
      });
    }

    if (!elementId || !elementLabel || !response || !sessionId) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: elementId, elementLabel, or response",
      });
    }

    // Find existing response session or create new one
    let formResponse = await FormResponse.findOne({
      formId: form._id,
      sessionId,
      status: { $in: ["started", "in_progress"] },
    });

    if (!formResponse) {
      formResponse = new FormResponse({
        formId: form._id,
        sessionId,
        ipAddress,
        responses: [],
        status: "started",
      });
    }

    // Add new response
    formResponse.responses.push({
      elementId,
      elementLabel,
      response,
      timestamp: new Date(),
    });

    formResponse.lastInteractionAt = new Date();
    formResponse.status = "in_progress";

    // Check if this is the last response
    if (formResponse.responses.length === form.elements.length) {
      formResponse.status = "completed";
      formResponse.completedAt = new Date();

      // Update completion stats
      await FormStat.findOneAndUpdate(
        { formId: form._id },
        {
          $inc: { completed: 1 },
          $set: { lastUpdated: new Date() },
        },
        { upsert: true }
      );
    }

    await formResponse.save();

    res.status(200).json({
      success: true,
      formResponse,
    });
  } catch (error) {
    console.error("Error saving public form response:", error);
    res.status(500).json({
      success: false,
      message: "Error saving form response",
      error: error.message,
    });
  }
};
module.exports = {
  saveFormResponse,
  getFormResponses,
  incrementFormView,
  savePublicFormResponse,
};
