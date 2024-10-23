const express = require("express");
const app = express();
const env = require("dotenv").config();
const path = require("path");
const db = require("./config/db")
const userRouter = require("./routes/userRouter");
db()
app.use(express.static(path.join(__dirname,"public/ludus-free-premium-ecommerce-template-master")));
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.set("view engine","ejs");
app.set("views", [path.join(__dirname,'views/user'),path.join(__dirname, 'views/admin')]);


app.use("/",userRouter);

// app.listen(process.env.PORT, ()=> console.log("Server is running"));
db().then(()=>{
    console.log("hi");
    app.listen(process.env.PORT,() => {console.log(`server running on port${process.env.PORT}`)})
}).catch(error =>{
    console.log(`failed to connect to the database`,error)
})
module.exports = app;