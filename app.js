const express = require("express");
const app = express();
const env = require("dotenv").config();
const db = require("./config/db")
db()

// app.listen(process.env.PORT, ()=> console.log("Server is running"));
db().then(()=>{
    console.log("hi");
    app.listen(process.env.PORT,() => {console.log(`server running on port${process.env.PORT}`)})
}).catch(error =>{
    console.log(`failed to connect to the database`,error)
})
module.exports = app;