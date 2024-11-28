
const Product = require("../../models/productSchema");


const loadHomepage = async(req, res) =>{
    try{
         const user = req.session.user || req.session.passport;
         let product = await Product.find({isBlocked:false});
         if(user){
            console.log("hi");
            
            return res.render('home', {user,product})
         }else{
            console.log("Hello");
            return res.render('home',{product});  
         }
        
    }catch(error){
        console.log("home page not found");
        res.status(500).send("server error")
    }
}


module.exports = {
    loadHomepage
    
}
    
