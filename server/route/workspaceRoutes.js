const express = require("express");

const {
  createWorkspace,
  getUserWorkspaces,
  shareWorkspace,
  createFolder,
  deleteFolder,
  createTypebot,
  createIndependentTypebot,
  deleteTypebot,
  deleteIndependentTypebot,
  generateShareLink,
  joinWorkspaceViaLink,
} = require("../Controller/workspaceController");
const userMiddleware = require("../middleware/userMiddleware");
const router = express.Router();

router.use(userMiddleware);

// Workspace routes
router.post("/create", createWorkspace);
router.get("/get", getUserWorkspaces);

router.post("/share", shareWorkspace);

// Folder routes
router.post("/:workspaceId/folders", createFolder);

router.delete("/:workspaceId/folders/:folderId", deleteFolder);

// Typebot routes
router.post("/:workspaceId/folders/:folderId/typebots", createTypebot);
router.post("/:workspaceId/typebots/independent", createIndependentTypebot);


router.delete("/:workspaceId/folders/:folderId/typebots/:formId", deleteTypebot);
router.delete("/:workspaceId/typebots/:formId", deleteIndependentTypebot);

router.post("/generate-share-link", generateShareLink);
router.post("/join-via-link", joinWorkspaceViaLink);

module.exports = router;
