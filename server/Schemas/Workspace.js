const mongoose = require('mongoose');

const WorkspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  forms: [
    {
      title: { type: String, required: true },
      fields: [
        {
          type: { type: String, required: true },
          id: { type: String, required: true },
          label: { type: String, required: true },
          content: { type: String },
        },
      ], // Correctly represent fields as an array of objects// For simplicity, we’ll store fields as an array of strings
    }
  ],
  folders: [
    {
      name: { type: String, required: true },
      forms: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Form' }],
    }
  ],
  sharedWith: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      permission: { type: String, enum: ['view', 'edit'], required: true },
    }
  ],
  shareLinks: [{
    sharetoken: String,
    permission: {
      type: String,
      enum: ['view', 'edit'],
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    }
  }]
});

module.exports = mongoose.model('Workspace', WorkspaceSchema);
