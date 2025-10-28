const User = require("../../models/userSchma");
const { STATUS_CODES, MESSAGES } = require("../../constants");




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
        return res.status(STATUS_CODES.NOT_FOUND).render("404");

    }
}

// Block user
const blockUser = async (req, res) => {
  try {
    const userId = req.params.id;

    //  Update the user as blocked
    const user = await User.findByIdAndUpdate(userId, { isBlocked: true });
    if (!user) {
      return res.status(STATUS_CODES.NOT_FOUND).json({ success: false, message: MESSAGES.USER.NOT_FOUND });
    }

    //  If the currently logged-in session belongs to the same user being blocked
    if (req.session) {

      const sessionUserId = req.session.user?._id?.toString();
      const sessionPassportId = req.session.passport?.user?._id?.toString();

      if (sessionUserId === userId || sessionPassportId === userId) {

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
    res.status(STATUS_CODES.OK).json({ success: true });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false });
  }
};


// Unblock user
const unblockUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findByIdAndUpdate(userId, { isBlocked: false });

        if (!user) {
            return res.status(STATUS_CODES.NOT_FOUND).json({ success: false });
        }
        res.status(STATUS_CODES.OK).json({ success: true});
    } catch (error) {
        console.error("Error unblocking user:", error);
        res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({ success: false });
    }
};




module.exports = {
    blockUser,
    unblockUser,
    getAllUsers,
   

};