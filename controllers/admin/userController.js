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
        if(req.session) {
            if(req.session.user){
                delete req.session.user;
            } else if(req.session.passport) {
                delete req.session.passport;
            }
        }
        
        const user = await User.findByIdAndUpdate(userId, { isBlocked: true });
        

        if (!user) {
            return res.status(404).json({ success: false});
        }
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