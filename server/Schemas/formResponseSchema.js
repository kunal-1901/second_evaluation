const mongoose = require("mongoose");

const formResponseSchema = new mongoose.Schema({
  formId: { type: mongoose.Schema.Types.ObjectId, ref: "Form", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Optional for anonymous responses
  sessionId: { type: String },
  ipAddress: { type: String },
  responses: [
    {
      elementId: String,
      elementLabel: String,
      response: mongoose.Schema.Types.Mixed,
      timestamp: { type: Date, default: Date.now },
    },
  ],
  status: {
    type: String,
    enum: ["started", "in_progress", "completed", "abandoned"],
    default: "started",
  },
  startedAt: { type: Date, default: Date.now },
  completedAt:{ type: Date },
  lastInteractionAt: { type: Date, default: Date.now },
});

const FormResponse = mongoose.model("FormResponse", formResponseSchema);
module.exports = FormResponse;