const jwt = require("jsonwebtoken");
const User = require("../Schemas/User");
const Workspace = require("../Schemas/Workspace");
require("dotenv").config();

const signupUser = async (req, res) => {
  console.log("Received registration request", req.body);
  const { name, email, password, confirmpassword } = req.body;
  
  if (!name || !email || !password || !confirmpassword) {
    return res
      .status(400)
      .json({ success: false, message: "Please fill all the fields" });
  }

  if (password !== confirmpassword) {
    return res
      .status(400)
      .json({ success: false, message: "Passwords do not match" });
  }

  try {
    // Create user first
    const user = await User.create({ name, email, password, confirmpassword });
    
    // Create default workspace for the user
    const defaultWorkspace = new Workspace({
      name: `${name}'s Workspace`,  // Create a personalized workspace name
      owner: user._id,
      forms: [],
      folders: [],
      sharedWith: []
    });
    
    await defaultWorkspace.save();
    
    // Add workspace reference to user's workspaces array
    user.workspaces.push(defaultWorkspace._id);
    await user.save();
    
    res.status(201).json({ 
      success: true, 
      message: "User registered successfully with default workspace",
      workspace: defaultWorkspace
    });
    
  } catch (error) {
    console.log("Error:", error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }

    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log("Recevied login request", { email });
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "User not found" });
    console.log("User found:", { email: user.email });
    console.log("Hashed Password:", { password: user.password });

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });
    }

    
    const token = jwt.sign(
      { id: user._id, name: user.name },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN,
      }
    );
    user.token = token;
    await user.save();
    res.json({
      token: token,
      user: { _id: user._id, name: user.name },
      isLoggedIn: true,
    });
  } catch (error) {
    console.log("Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const updateUser = async (req, res) => {
  const { name, email, oldpassword, newpassword } = req.body;

  try {
    const user = await User.findById(req.user.id);
    console.log("User found:", user);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    if (oldpassword && newpassword) {
      const isMatch = await bcrypt.compare(oldpassword, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid old password" });
      }
      user.password = newpassword;
      console.log("Password updated", user.password);
    }
    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;

    console.log("before :", user);
    await user.save();
    console.log("after :", user);
    res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


module.exports = { signupUser, loginUser, updateUser };
