const pageNotFound = async (req, res) =>{
    try{
        
        res.render("page-404");
    }catch(error){
        res.redirect("/pageNotFound");   
    }
}

module.exports = {pageNotFound};