const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchma");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const getProductAddPage = async(req, res)=>{
    try {
        const category = await Category.find();

        

        res.render('product-add', {category});
        
    } catch (error) {
        res.status(404).send("page not found");
    }
};

module.exports = {getProductAddPage,
    
}


const addProducts = async(req, res) =>{
    try {
        const products = req.body;
        console.log(req.body);
        console.log(req.files);
        const productExists = await Product.findOne({
            name:products.productName,

        });

        if(!productExists){
            const images = [];

            if(req.files && req.files.length>0){
                for(let i = 0; i<req.files.length; i++){
                    const originalImagePath = req.files[i].path;
                    console.log("image1");

                    const resizedImagePath = path.join('admin-public', 'assets','product2', req.files[i].filename);
                    console.log("image2");

                    await sharp(originalImagePath).resize({width:400, height:440}).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
            }

            // const categoryId = await Category.findOne({name: products.category});

            // if(!categoryId){
            //     return res.status(400).json("Invalid category name");
            // }

            const newProduct = new Product({
                name: products.productName,
                description: products.description, 
                categoryId: products.categoryId,
                price: products.price,
                createdOn:new Date(),
                quantity: products.quantity,
               
                image:  images, 

                status: 'Available',


            });

            await newProduct.save();
            return res.redirect("/admin/productList");
        }else{
            return res.status(400).json("Product already exist, please try with another name");
        }
    } catch (error) {
            console.error("Error saving product", error);
            return res.redirect("/admin/pageerror")
        
    }
}


const getAllProducts = async (req, res) =>{
        
    try {
        // console.log("product");
        // const search = req.query.search || "";
        // const page = req.query.page || 1;
        // const limit = 4;
        // console.log("product1");
        const productData = await Product.find();
        // .limit(limit*1).skip((page-1)*limit).populate('category').exec();
        // console.log("product2");
        // const count = await Product.find({
        //     productName:{$regex:new RegExp(".*"+search+".*", "i")},
        // }).countDocuments();

        console.log("categoory");

        const category = await Category.find({isListed:true});

        console.log("categooryend");
        console.log(productData);
        

          res.render("productList", {data:productData});
        // res.render("productList",{
        //     data: productData,
        //     currentPage: page,
        //     totalPages:Math.ceil(count/limit),
        //     cat: category,
        //   
        // })
   
        
    }catch(error){
        res.redirect("/pageerror");
    }
};

const getEditProduct = async(req, res) =>{
    try {
        const id = req.query.id;
        const product = await Product.findOne({_id: id});
        const category = await Category.find({});
        res.render("product-edit",{
            cat:category,
            product:product
        })
    } catch (error) {
        res.redirect("/pageerror");
        
    }
}


module.exports ={
    getProductAddPage,
    addProducts,
    getAllProducts
}

