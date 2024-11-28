const pageError = (req, res) =>{
    try {
        res.render("404Error");
    } catch (error) {
        console.error("page not found");
        res.redirect("/admin/pageerror");
    }
}

module.exports= {pageError};