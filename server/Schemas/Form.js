const mongoose = require("mongoose");

const ElementSchema = new mongoose.Schema({
  type: { type: String, required: true }, // e.g., "input-text", "input-email"
  id: { type: String, required: true },   // unique identifier for the element
  label: { type: String, required: true }, // the label for the form element
  content: { type: String }, // content or placeholder text
}, { _id: false });

const VersionSchema = new mongoose.Schema({
  elements: [ElementSchema], // Array of elements
  updatedAt: { type: Date, default: Date.now },
});

const formSchema = new mongoose.Schema({
  formName: { type: String, required: true, default: "Untitled Form" },
  elements: { type: [ElementSchema], default: [] },// Explicitly define elements array
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sharedWith: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      permission: { type: String, enum: ["view", "edit"], required: true },
    },
  ],
  versions: [VersionSchema], // Array of versions with elements
  shareToken: { type: String },
  isPublic: { type: Boolean, default: false },
});

// Middleware to update timestamps
formSchema.pre("save", function (next) {
  if (!this.createdAt) this.createdAt = Date.now();
  this.updatedAt = Date.now();
  next();
});

// Add indexes
formSchema.index({ userId: 1 });

const Form = mongoose.model("Form", formSchema);
module.exports = Form;
