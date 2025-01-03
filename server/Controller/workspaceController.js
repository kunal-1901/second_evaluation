const Workspace = require("../Schemas/Workspace"); // Note: Changed from User to Workspace
const User = require("../Schemas/User");
const Form = require("../Schemas/Form");
const crypto = require('crypto');

exports.createWorkspace = async (req, res) => {
  const { name } = req.body;
  const owner = req.user.id;
  try {
    // Create workspace
    const workspace = new Workspace({
      name,
      owner,
      forms: [],
      folders: [],
      sharedWith: [],
    });

    await workspace.save();

    // Add workspace to user's workspaces array
    await User.findByIdAndUpdate(owner, {
      $push: { workspaces: workspace._id },
    });

    res.status(201).json(workspace);
  } catch (error) {
    console.error("Error creating workspace:", error);
    res
      .status(500)
      .json({ message: "Error creating workspace", error: error.message });
  }
};

exports.getUserWorkspaces = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get workspaces owned by user and shared with user
    const workspaces = await Workspace.find({
      $or: [{ owner: userId }, { "sharedWith.user": userId }],
    })
      .populate("owner", "name email")
      .populate("sharedWith.user", "name email");

    res.status(200).json(workspaces);
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    res
      .status(500)
      .json({ message: "Error fetching workspaces", error: error.message });
  }
};

exports.shareWorkspace = async (req, res) => {
  const { workspaceId, email, permission } = req.body;
  const ownerId = req.user.id;

  try {
    console.log("Request to Share Workspace:");
    console.log("Workspace ID:", workspaceId);
    console.log("User Email:", email);
    console.log("Permission:", permission);
    console.log("Requesting User ID (Owner):", ownerId);
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate permission input
    if (!["view", "edit"].includes(permission)) {
      return res.status(400).json({ message: 'Invalid permission. Allowed values are "view" or "edit".' });
    }

    // Find workspace and verify ownership
    const workspace = await Workspace.findById(workspaceId).select('owner sharedWith');
    console.log("Workspace Retrieved:", workspace);
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }
    console.log("Workspace Owner:", workspace.owner, typeof workspace.owner);
    console.log("Request User ID (ownerId):", ownerId, typeof ownerId);
    console.log(
      "Comparison Result:",
      workspace.owner.toString() === ownerId.toString()
    );

    if (workspace.owner.toString() !== ownerId.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to share this workspace" });
    }

    // Find user by email
    const userToShare = await User.findOne({ email }).select('_id');
    console.log("User to Share:", userToShare);
    if (!userToShare) {
      return res.status(404).json({ message: "User not found" });
    }
    const shareIndex = workspace.sharedWith.findIndex(
      (share) => share.user.toString() === userToShare._id.toString()
    );

    if (shareIndex !== -1) {
      workspace.sharedWith[shareIndex].permission = permission;
    } else {
      workspace.sharedWith.push({ user: userToShare._id, permission });
    }

    await workspace.save();

    return res.status(200).json({
      message: shareIndex !== -1 ? "Permission updated successfully" : "Workspace shared successfully",
      workspace,
    });
  } catch (error) {
    console.error("Error sharing workspace:", error);
    res
      .status(500)
      .json({ message: "Error sharing workspace", error: error.message });
  }
};

// Folder Operations
exports.createFolder = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { name } = req.body;
    const userId = req.user.id;

    const workspace = await Workspace.findOne({
      _id: workspaceId,
      $or: [
        { owner: userId },
        { sharedWith: { $elemMatch: { user: userId, permission: "edit" } } },
      ],
    });

    if (!workspace) {
      return res
        .status(404)
        .json({ message: "Workspace not found or unauthorized" });
    }

    workspace.folders.push({ name, forms: [] });
    await workspace.save();

    res.status(201).json(workspace);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating folder", error: error.message });
  }
};


exports.deleteFolder = async (req, res) => {
  try {
    const { workspaceId, folderId } = req.params;
    const userId = req.user.id;

    if (!workspaceId || !folderId) {
      return res.status(400).json({ 
        message: "Missing required parameters", 
        workspaceId: workspaceId || 'missing', 
        folderId: folderId || 'missing' 
      });
    }

    const workspace = await Workspace.findOne({
      _id: workspaceId,
      $or: [
        { owner: userId },
        { sharedWith: { $elemMatch: { user: userId, permission: "edit" } } },
      ],
    });

    if (!workspace) {
      return res
        .status(404)
        .json({ message: "Workspace not found or unauthorized" });
    }
    const folderExists = workspace.folders.id(folderId);
    if (!folderExists) {
      return res.status(404).json({ message: "Folder not found" });
    }

  const formsToDelete = folderExists.forms;
    workspace.forms = workspace.forms.filter(form => 
      !formsToDelete.includes(form._id.toString())
    );


    workspace.folders.pull({ _id: folderId });
    await workspace.save();

    res.status(200).json({ 
      message: "Folder deleted successfully",
      workspaceId,
      folderId
    });
  } catch (error) {
    console.error("Error in deleteFolder:", error);
    res.status(500).json({ 
      message: "Error deleting folder", 
      error: error.message 
    });
  }
};

// Typebot Operations
exports.createTypebot = async (req, res) => {
  try {
    const { workspaceId, folderId } = req.params;
    const { title, fields } = req.body;
    const userId = req.user.id;

    const workspace = await Workspace.findOne({
      _id: workspaceId,
      $or: [
        { owner: userId },
        { sharedWith: { $elemMatch: { user: userId, permission: "edit" } } },
      ],
    });

    if (!workspace) {
      return res
        .status(404)
        .json({ message: "Workspace not found or unauthorized" });
    }

    const folder = workspace.folders.id(folderId);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    const newForm = new Form({
      formName: title,
      elements: fields,
      userId,
      workspaceId,
    });
    const savedForm = await newForm.save();
    folder.forms.push(savedForm._id);
    workspace.forms.push({ title, fields, _id: savedForm._id }); // Sync with workspace.forms array
    await workspace.save();
    
    res.status(201).json(workspace);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating typebot", error: error.message });
  }
};

exports.createIndependentTypebot = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { title } = req.body;
    const userId = req.user.id;

    const workspace = await Workspace.findOne({
      _id: workspaceId,
      $or: [
        { owner: userId },
        { sharedWith: { $elemMatch: { user: userId, permission: "edit" } } },
      ],
    });

    if (!workspace) {
      return res
        .status(404)
        .json({ message: "Workspace not found or unauthorized" });
    }

    // Create new form without folder association
    const newForm = new Form({
      formName: title,
      elements: [],
      userId,
      workspaceId,
    });

    const savedForm = await newForm.save();
    
    // Add to workspace forms array only
    workspace.forms.push({ 
      title, 
      fields: [], 
      _id: savedForm._id 
    });
    
    await workspace.save();
    
    res.status(201).json({
      success: true,
      form: {
        _id: savedForm._id,
        title: savedForm.formName,
        fields: savedForm.elements
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error creating independent typebot", 
      error: error.message 
    });
  }
};

exports.deleteTypebot = async (req, res) => {
  try {
    const { workspaceId, folderId, formId } = req.params;
    const userId = req.user.id;

    if (!workspaceId || !folderId || !formId) {
      return res.status(400).json({ 
        message: "Missing required parameters",
        workspaceId: workspaceId || 'missing',
        folderId: folderId || 'missing',
        formId: formId || 'missing'
      });
    }

    const workspace = await Workspace.findOne({
      _id: workspaceId,
      $or: [
        { owner: userId },
        { sharedWith: { $elemMatch: { user: userId, permission: "edit" } } },
      ],
    });

    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found or unauthorized" });
    }

    const folder = workspace.folders.id(folderId);
    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    const formExists = workspace.forms.id(formId);
    if (!formExists) {
      return res.status(404).json({ message: "Typebot not found" });
    }

    // Remove form from both folder and forms array
    folder.forms = folder.forms.filter(f => f.toString() !== formId);
    workspace.forms.pull({ _id: formId });
    
    await workspace.save();
    res.status(200).json({ 
      message: "Typebot deleted successfully",
      workspaceId,
      folderId,
      formId
    });
  } catch (error) {
    console.error("Error in deleteTypebot:", error);
    res.status(500).json({ 
      message: "Error deleting typebot", 
      error: error.message 
    });
  }
};


exports.deleteIndependentTypebot = async (req, res) => {
  try {
    const { workspaceId, formId } = req.params;
    const userId = req.user.id; // Assuming you have user info from middleware

    // Find the workspace
    const workspace = await Workspace.findById(workspaceId);
    
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    // Check if user has permission to modify this workspace
    if (workspace.owner.toString() !== userId.toString() && 
        !workspace.sharedWith.some(share => 
          share.user.toString() === userId.toString() && 
          share.permission === 'edit'
        )) {
      return res.status(403).json({ message: "You don't have permission to modify this workspace" });
    }

    // Remove the typebot from the workspace's forms array
    workspace.forms = workspace.forms.filter(form => form._id.toString() !== formId);

    // Save the workspace
    await workspace.save();

    // If you have a separate Forms collection, you might want to delete the form document as well
    // await Form.findByIdAndDelete(formId);

    res.status(200).json({
      message: "Typebot deleted successfully",
      workspace
    });

  } catch (error) {
    console.error("Error in deleteIndependentTypebot:", error);
    res.status(500).json({
      message: "Failed to delete typebot",
      error: error.message
    });
  }
};

exports.generateShareLink = async (req, res) => {
  const { workspaceId, permission } = req.body;
  const ownerId = req.user.id;

  try {
    // Input validation
    if (!workspaceId || !permission) {
      return res.status(400).json({ 
        message: "Missing required fields",
        required: { workspaceId: !!workspaceId, permission: !!permission }
      });
    }

    // Find workspace and verify ownership
    const workspace = await Workspace.findById(workspaceId);
    
    if (!workspace) {
      return res.status(404).json({ message: "Workspace not found" });
    }

    if (workspace.owner.toString() !== ownerId.toString()) {
      return res.status(403).json({ message: "Not authorized to share this workspace" });
    }

    // Generate a unique share token
    const shareToken = crypto.randomBytes(32).toString('hex');
    
    // Add share link to workspace
    const shareLink = {
      sharetoken: shareToken,
      permission,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
    };

    // Initialize shareLinks array if it doesn't exist
    if (!workspace.shareLinks) {
      workspace.shareLinks = [];
    }

    workspace.shareLinks.push(shareLink);
    await workspace.save();

    // Construct the full share URL
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8000'; // Fallback URL
    const fullShareUrl = `${baseUrl}/workspaces/join/${shareToken}`;

    return res.status(200).json({
      success: true,
      shareToken,
      shareLink: fullShareUrl
    });
    
  } catch (error) {
    console.error("Error generating share link:", error);
    return res.status(500).json({ 
      message: "Error generating share link", 
      error: error.message 
    });
  }
};

exports.joinWorkspaceViaLink = async (req, res) => {
  const { shareToken } = req.params;
  const userId = req.user.id;

  try {
    // Find workspace with valid share link
    const workspace = await Workspace.findOne({
      'shareLinks.token': shareToken,
      'shareLinks.expiresAt': { $gt: new Date() }
    });

    if (!workspace) {
      return res.status(404).json({ message: "Invalid or expired share link" });
    }

    // Find the specific share link
    const shareLink = workspace.shareLinks.find(link => link.token === shareToken);

    // Check if user is already a member
    const isAlreadyShared = workspace.sharedWith.some(
      share => share.user.toString() === userId.toString()
    );

    if (!isAlreadyShared) {
      // Add user to sharedWith array
      workspace.sharedWith.push({
        user: userId,
        permission: shareLink.permission
      });

      await workspace.save();

      // Add workspace to user's workspaces array
      await User.findByIdAndUpdate(userId, {
        $addToSet: { workspaces: workspace._id }
      });
    }

    res.status(200).json({
      success: true,
      message: isAlreadyShared ? "Already a member of workspace" : "Successfully joined workspace",
      workspace
    });
  } catch (error) {
    console.error("Error joining workspace:", error);
    res.status(500).json({ 
      message: "Error joining workspace", 
      error: error.message 
    });
  }
};