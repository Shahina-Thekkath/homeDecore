
const isLogin = (req, res, next) => {
  try {
    if (req.session.user) {
      return next();
    } else {
      return res.redirect('/');
    }
  } catch (error) {
    console.log("IsLogin middleware error", error.message);
    res.redirect('/');
  }
};

module.exports = { isLogin };







const isLogout = async (req,res,next)=>{
   try {
    const user = req.session.user
    const passport = req.session.passport
    if(user||passport){
        res.redirect('/');
    }else{
        next();
    }
   } catch (error) {
    console.log("isLogout middleware error ",error.message);
   }
}



const sessionVerify = async (req, res, next) =>{
    try {
        const user = req.session.user
        const passport = req.session.passport || req.session.passport?.user;

        console.log("sessionVerify", user, passport);
        

        if(user||passport){
            console.log("passport", passport);
            
            next();
        }else{
          if (req.xhr) {
            return res.status(401).json({ success: false, error: "Please login first" });
          }
          // Otherwise, normal redirect
          return res.redirect('/login');
        }
    } catch (error) {
        console.log("IsLogin middleware error",error);
    }
};



module.exports={
    isLogin,
    isLogout,
    sessionVerify
}