const isLogin = async (req,res,next)=>{
    try {
        const admin = req.session.admin
       
        if(admin){
            next();
        }else{
            res.redirect('/admin');
        }
        
    } catch (error) {
        console.log("Islogin middleware error",error.message);
    }
}






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