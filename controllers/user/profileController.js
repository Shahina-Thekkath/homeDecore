const session = require("express-session");
const User = require("../../models/userSchma");


const userProfile = async(req, res) =>{
    try {
        
        const user = req.session.user || req.session.passport?.user;
        const userData = await User.findById(user._id);
       
        res.render('userProfile',{user: userData});
    } catch (error) {
        console.error('Internal Sever Error',error);
        res.redirect('/pageNotFound');
        
    }
};

const getEditProfile = async(req, res) =>{
    try {
        const userId = req.session.user?._id || req.session.passport?.user?._id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).send('user not found');
        }
        res.render('editProfile', {user});

        
    } catch (error) {
        console.error("Error getting Edit Profile page", error);
        res.status(404).send('Internal Server Error');
    }
};

const updateProfile = async (req, res) => {
  try {
    if (!req.session.user && !req.session.passport) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again."
      });
    }

    const { name, gender, email, phone } = req.body;
    const userId = req.session.user._id || req.session.passport._id;
    
    const errors = {};
    if (!name || !name.trim()) errors.name = "Name is required.";
    if (!email || !email.trim()) errors.email = "Email is required.";
    if (!phone || !phone.trim()) errors.phone = "Phone number is required.";
    if (!gender || !gender.trim()) errors.gender = "Gender is required.";

    if (Object.keys(errors).length > 0) {
      return res.json({ success: false, errors });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    //  Update data
    await User.findByIdAndUpdate(userId, {
      $set: { name, email, phone, gender }
    });

    return res.json({
      success: true,
      message: "Profile updated successfully!"
    });

  } catch (error) {
    console.error("Internal Server Error", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error. Please try again later."
    });
  }
};

module.exports = {userProfile,
                  getEditProfile,
                  updateProfile
};