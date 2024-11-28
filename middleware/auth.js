const User = require('../models/userSchma');

const userAuth = (req, res, next)=>{
    if(req.session.user){
        User.findById(req.session.user)
        .then(data =>{
            if(data && !data.isBlocked){
                next();
            }else{
                res.redirect("/login");
            }
        })
        .catch(error => {console.log("error in user authmiddleware");
         res.status(500).send("Internal Server error");
    })
    }else{
        res.redirect("/login");
    }
};



const adminAuth = (req, res, next)=>{
    User.findOne({is_admin:true})
    .then(data =>{
        if(data){
            next()
        }
        else{
            res.redirect('/admin/login');
        }
    }).catch(error=>{
        console.log("error in admin middleware auth", error);
        res.status(500).send("Internal server error");
    })
};


module.exports ={
    userAuth,
    adminAuth
}
