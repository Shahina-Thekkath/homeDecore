const isLogin = async (req, res, next) => {
  try {
    if (req.session.admin) {
      return next();
    }

    // Handle AJAX requests
    if (req.xhr) {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    // Handle normal browser requests
    return res.redirect("/admin");
  } catch (error) {
    console.error("isLogin middleware error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
};







const isLogout = async (req,res,next)=>{
   try {
    const admin = req.session.admin

    if(admin){
        res.redirect('/admin/dashboard');
    }else{
        next();
    }
   } catch (error) {
    console.log("islogout middleware error ",error.message);
   }
}



module.exports={
    isLogin,
    isLogout
}