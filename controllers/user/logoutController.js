const logout = async(req, res) =>{
    try {
        if(req.session.user && req.session){
            
            delete req.session.user
        }else if(req.session.passport && req.session){
             delete req.session.passport  
        }
        return res.redirect("/?logout=logout Successfully");
    } catch (error) {
        res.redirect("/pageNotFound");
    }
}

module.exports = {logout};