const logout = async(req, res) =>{
    try {
        if(req.session) {
            req.session.destroy((err) => {
                if(err) {
                    console.log("Session destroy error", err);
                    res.redirect("/pageNotFound");
                }
                // Clear session cookie manually (optional but recommended)
                res.clearCookie("connect.sid"); // default cookie name
                return res.redirect("/?logout=LogoutSuccessfully");
            });
        } else {
            return res.redirect("/");
        }
        
        
    } catch (error) {
        console.error("logout Error", error);
        res.redirect("/pageNotFound");
    }
}

module.exports = {logout};