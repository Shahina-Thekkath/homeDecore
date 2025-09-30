

const logout = async(req,res)=>{
try {
       if(req.session && req.session.admin){
        delete req.session.admin;

        setTimeout(()=>{
            res.redirect('/admin');
        },1500);
        
       } 
    } catch (error) {

        console.error("unexpected error during logout", error);
        res.redirect("/pageerror");
    } 
}

module.exports = {logout}
