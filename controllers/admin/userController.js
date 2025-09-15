const User = require("../../models/userSchma");



const getAllUsers = async (req,res)=>{
    try {
    

        const currentPage = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const limit = 5; 
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
        console.log("userManagement error",error.message);
        return res.status(404).render("404");

    }
}


// const getUserById = async(req, res) =>{
//     const userId = req.params.id;
//     try {
//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ message: "User not found" });
//         }
//         res.render('userList', { user }); // Render a view with user details
//     } catch (error) {
//         console.error("Error fetching user:", error);
//         res.status(500).json({ message: "Server error" });
//     }
// }



// Block user
const blockUser = async (req, res) => {
           console.log("block",req.params.id);
    try {
        const userId = req.params.id;
        delete req.session.user;
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
         console.log("unblock",req.params.id);
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