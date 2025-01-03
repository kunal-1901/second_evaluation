const mongoose = require("mongoose");

const formStatSchema = new mongoose.Schema({
  formId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Form", 
    required: true 
  },
  views: {
    type: Number,
    default: 0
  },
  uniqueViews: [{
    userId: String,
    timestamp: Date,
    ipAddress: String
  }],
  starts: {
    type: Number,
    default: 0
  },
  completed: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

formStatSchema.index({ formId: 1 });

const FormStat = mongoose.model("FormStat", formStatSchema);
module.exports = FormStat;