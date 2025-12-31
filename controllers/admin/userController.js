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

  const user = await User.findByIdAndUpdate(userId,
    {$set:{isBlocked: true}},
    {new: true}
  );
  

  if(!user) {
    return res.
    status(STATUS_CODES.NOT_FOUND)
    .json({success: false, message: MESSAGES.USER.NOT_FOUND});
  }

return res.status(STATUS_CODES.OK).json({success: true});
  } catch (error) {
    console.error("Error blocking user:", error);
    return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({success: false});
  }
}


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