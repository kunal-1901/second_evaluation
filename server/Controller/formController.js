const Form = require("../Schemas/Form");
const User = require("../Schemas/User");
const Workspace = require("../Schemas/Workspace");
require("dotenv").config();
const crypto = require("crypto");


const generateShareToken = () => {
  return crypto.randomBytes(32).toString("hex");
};
const getFormDetails = async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.user.id;

    // Fetch the form and ensure the user has access
    const form = await Form.findOne({ _id: formId, userId }).populate("userId", "name email");

    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found or unauthorized" });
    }

    res.status(200).json({ success: true, form });
  } catch (error) {
    console.error("Error fetching form details:", error);
    res.status(500).json({ message: "Error fetching form details", error: error.message });
  }
};


const saveForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const { formName, elements } = req.body;
    const userId = req.userId; // Retrieved from middleware
    if (!userId) return res.status(400).json({ message: "User ID required" });

    // const newForm = new Form({
    //   formName,
    //   elements,
    //   userId,
    //   responses: {}, 
    // });

    if (!Array.isArray(elements)) {
      return res.status(400).send({ error: "Elements must be an array." });
    }

    const updatedForm = await Form.findByIdAndUpdate(
      formId,
      { formName, elements, updatedAt: Date.now() },
      { new: true, runValidators: true, context: 'query'  }
    );

    if (!updatedForm) {
      return res.status(404).json({ message: "Form not found or unauthorized" });
    }

    await Workspace.updateOne(
      { forms: { $elemMatch: { _id: formId } } },
      { $set: { "forms.$.title": formName, "forms.$.fields": elements } }
    );


    res.status(201).json({
      success: true,
      form: updatedForm,
    });
  } catch (error) {
    console.error("Error saving form:", error);
    res.status(500).json({
      success: false,
      message: "Error saving form",
      error: error.message,
    });
  }
};

const getUserForms = async (req, res) => {
  try {
    const userId = req.user.id;
    const forms = await Form.find({ userId })
      .sort({ createdAt: -1 }) // Sort by newest first
      .populate("userId", "name email"); // Optionally populate user details

    res.status(200).json({
      success: true,
      forms,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching forms",
      error: error.message,
    });
  }
};

const getFormById = async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.user.id;

    const form = await Form.findOne({
      _id: formId,
      userId, // Ensure user can only access their own forms
    }).populate("userId", "name email");

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found or unauthorized",
      });
    }

    res.status(200).json({
      success: true,
      form,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching form",
      error: error.message,
    });
  }
};

const deleteForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.user.id;

    // Find and delete form, ensuring it belongs to the user
    const deletedForm = await Form.findOneAndDelete({
      _id: formId,
      userId,
    });

    if (!deletedForm) {
      return res.status(404).json({
        success: false,
        message: "Form not found or unauthorized",
      });
    }

    // Remove form reference from user's forms array
    await User.findByIdAndUpdate(userId, {
      $pull: { forms: formId },
    });

    res.status(200).json({
      success: true,
      message: "Form deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting form",
      error: error.message,
    });
  }
};
const shareForm = async (req, res) => {
  try {
    const { formId } = req.params;
    const userId = req.user.id;

    // Find the form and verify ownership
    const form = await Form.findOne({
      _id: formId,
      userId,
    });

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found or unauthorized",
      });
    }

    // Generate a unique share token if it doesn't exist
    if (!form.shareToken) {
      form.shareToken = generateShareToken();
    }

    // Update form visibility
    form.isPublic = true;
    await form.save();

    // Generate shareable URL (you'll need to replace with your frontend URL)
    const shareableUrl = `${process.env.FRONTEND_URL}/form/${form.shareToken}`;

    res.status(200).json({
      success: true,
      shareToken: form.shareToken,
      shareableUrl,
      message: "Form shared successfully",
    });
  } catch (error) {
    console.error("Error sharing form:", error);
    res.status(500).json({
      success: false,
      message: "Error sharing form",
      error: error.message,
    });
  }
};

const getPublicForm = async (req, res) => {
  try {
    const { shareToken } = req.params;

    // Find the form by share token
    const form = await Form.findOne({
      shareToken,
      isPublic: true,
    }).select("-userId -responses -sharedWith -versions"); // Exclude sensitive data

    if (!form) {
      return res.status(404).json({
        success: false,
        message: "Form not found or no longer accessible",
      });
    }

    // Transform form data for public consumption
    const publicFormData = {
      formId: form._id,
      formName: form.formName,
      elements: form.elements.map((element) => ({
        type: element.type,
        label: element.label,
        content: element.content,
        // Exclude any sensitive or unnecessary fields
      })),
      createdAt: form.createdAt,
    };

    res.status(200).json({
      success: true,
      form: publicFormData,
    });
  } catch (error) {
    console.error("Error fetching public form:", error);
    res.status(500).json({
      success: false,
      message: "Error accessing form",
      error: error.message,
    });
  }
};

module.exports = {
  getFormDetails,
  saveForm,
  getUserForms,
  getFormById,
  deleteForm,
  shareForm,
  getPublicForm,
};
