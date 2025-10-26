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
    const userId = req.session.user?._id || req.session.passport?.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again."
      });
    }

    const { name, gender, phone } = req.body;
    const errors = {};

    const nameRegex = /^[a-zA-Z\s.]+$/;
    const phoneRegex = /^[6-9]\d{9}$/;
    const genderRegex = /^(male|female)$/;

    if (!name || !nameRegex.test(name)) errors.name = "Name must contain only letters, spaces, or dot.";
    if (!phone || !phoneRegex.test(phone)) errors.phone = "Phone must be a valid 10-digit number starting with 6-9.";
    if (!gender || !genderRegex.test(gender)) errors.gender = "Please select a valid gender.";

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, errors });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    await User.findByIdAndUpdate(userId, { $set: { name, phone, gender } });

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