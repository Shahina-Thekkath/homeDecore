const User = require("../../models/userSchma");



const getAllUsers = async (req,res)=>{
    try {
        const currentPage = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const limit = 8; 
        const skip = (currentPage - 1) * limit;

        const searchQuery = search ? {
            $or: [
                { name: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') }
            ]
        } : {};

        const totalUsers = await User.countDocuments({ ...searchQuery, is_admin: false });
        const totalPages = Math.ceil(totalUsers / limit);

        const users = await User.find({ ...searchQuery, is_admin: false }).skip(skip).limit(limit);

        res.render("userList", {
            users,
            currentPage,
            totalPages,
            baseUrl: "/admin/users",
            search
        });
    }  catch (error) {
        console.error("userManagement error",error);
        return res.status(404).render("404");

    }
}

// Block user
const blockUser = async (req, res) => {
  try {
    const userId = req.params.id;
    console.log("Block request for user:", userId);

    //  Update the user as blocked
    const user = await User.findByIdAndUpdate(userId, { isBlocked: true });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    //  If the currently logged-in session belongs to the same user being blocked
    if (req.session) {
      console.log("Current Session Data:", req.session);

      const sessionUserId = req.session.user?._id?.toString();
      const sessionPassportId = req.session.passport?.user?._id?.toString();

      if (sessionUserId === userId || sessionPassportId === userId) {
        console.log("Blocking logged-in user session:", userId);

        // Delete only user-related session data, not the admin
        delete req.session.user;
        delete req.session.passport;

        // Save session changes
        req.session.save((err) => {
          if (err) console.error("Error saving session after user deletion:", err);
        });
      } else {
        console.log("Admin session detected — skipping session removal.");
      }
    }

    // 3️⃣ Send success response
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({ success: false });
  }
};


// Unblock user
const unblockUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findByIdAndUpdate(userId, { isBlocked: false });

        if (!user) {
            return res.status(404).json({ success: false });
        }
        res.status(200).json({ success: true});
    } catch (error) {
        console.error("Error unblocking user:", error);
        res.status(500).json({ success: false });
    }
};




module.exports = {
    blockUser,
    unblockUser,
    getAllUsers,
   

};