const session = require("express-session");
const User = require("../../models/userSchma");


const userProfile = async(req, res) =>{
    try {
        
        const user = req.session.user || req.session.passport;
        const userData = await User.findById(user._id);

         console.log("userData", userData);
         

        res.render('userProfile',{user: userData});
    } catch (error) {
        console.error('Internal Sever Error',error);
        res.redirect('/pageNotFound');
        
    }
};

const getEditProfile = async(req, res) =>{
    try {
        console.log("req.body", req.body);
        
        const userId = req.session.user._id;
        const user = await User.findById(userId);

        if (!user) {
            console.log("User not found");
            res.status(404).send('user not found');
        }
        
        console.log(user);
        res.render('editProfile', {user});

        
    } catch (error) {
        console.error("Internal Server Error");
        res.status(404).send('Internal Server Error');
    }
};

const updateProfile = async(req,res) =>{
   try {
         console.log("req.body:",req.body);
         
          const{name, gender, email, phone} = req.body;
          const userId = req.session.user._id;
          const user = await User.findById(userId);

         if(!user){
            console.log("User not found");
            res.status(404).send('user not found');
         }
         
         const updatedData ={
            name : name,
            email : email,
            phone : phone,
            gender: gender
         }
        

         await User.findByIdAndUpdate(userId, 
              {$set: updatedData},
              {new: true});

        // Fetch the updated user to ensure it reflects in the template
         const updatedUser = await User.findById(userId);

        console.log("updatedUser",updatedUser);
        

        res.redirect('/profile?success=true');


   } catch (error) {
      console.error('Internal server Error', error);
      res.render('/pageNotFound');
      
   }
};

module.exports = {userProfile,
                  getEditProfile,
                  updateProfile
};