const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const fs = require("fs");
const mongoose = require("mongoose");
const cloudinary = require('cloudinary');

const getProductAddPage = async (req, res) => {
  try {
    const category = await Category.find({isBlocked: false});

    res.render("product-add", { category });
  } catch (error) {
    res.status(404).send("page not found");
  }
};

const addProducts = async (req, res) => {
  try {
    const products = req.body;
    const errors = {};

     if (!products.productName || products.productName.trim().length < 3) {
      errors.productName = "Product name must be at least 3 characters long.";
    }

    // Category
    if (!products.categoryId) {
      errors.categoryId = "Category is required.";
    }

    // Price
    if (!products.price || isNaN(products.price) || Number(products.price) <= 0) {
      errors.price = "Price must be a valid number greater than 0.";
    }

    // Quantity
    if (!products.quantity || isNaN(products.quantity) || Number(products.quantity) < 0) {
      errors.quantity = "Quantity must be a non-negative number.";
    }

    // Description
    if (
      !products.description ||
      products.description.length < 10 ||
      products.description.length > 1000
    ) {
      errors.description = "Description should be between 10 - 1000 characters.";
    }

    // Images
    if (!req.files || req.files.length < 3) {
      errors.images = "At least three product images required.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    
    let uploadedImages = [];
    if (req.files && req.files.length > 0) {
      const uploadResults = await Promise.all(
        req.files.map((file) => {
          return cloudinary.uploader.upload(file.path, {folder: 'products'})
        })
      );
     
      uploadedImages = uploadResults.map((r) => ({
        public_id: r.public_id,
        url: r.secure_url
      }));



    }
    
    const newProduct = new Product({
      name: products.productName,
      description: products.description,
      specification:  products.specifications.map(spec =>({key: spec.key, value: spec.value})),
      categoryId: products.categoryId,
      price: products.price,
      createdOn: new Date(),
      quantity: products.quantity,
      image: uploadedImages,
      status: "Available"
    });
   
    await newProduct.save();
    return res.json({ message: "Product added successfully!" });
  } catch (error) {
    console.error("Error saving product", error);
    return res.redirect("/admin/pageerror");
  }
};

const getAllProducts = async (req, res) => {
  try {
    const productData =  await Product.find({isBlocked: false}).populate("categoryId", "name");

    const categories = await Category.find({isBlocked: false}, 'name');
    const productNames = await Product.find({isBlocked: false}, 'name');

    res.render("productList", { 
                data: productData,
                categories,
                productNames
     });
  } catch (error) {
    console.error("Error loading productList: ", error);
    res.redirect("/pageerror");
  }
};

const getEditProduct = async (req, res) => {
  try {
    const id = req.params.id;

    const product = await Product.findOne({ _id: id });
    const category = await Category.find({});
  
    //when done normally
    res.render("product-edit", {
      category,
      product,
    });

    //when doing with fetch()
  } catch (error) {
    //     res.redirect("/pageerror");
    console.error("Error editing product", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};



const updateProduct = async (req, res) => {
  try {
    const {
      productId,
      productName,
      categoryId,
      price,
      quantity,
      description,
      specifications = [] ,
      replaceImageIndex,
      deletedImages,
    } = req.body;
    

    let filteredSpecifications = specifications.filter(spec => spec && spec.key && spec.value);

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).send("Product not found");
    }

    product.name = productName;
    product.categoryId = categoryId;
    product.price = price;
    product.quantity = quantity;
    product.description = description;
    product.specification = filteredSpecifications ;

    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => ({
        url: file.path,
        public_id: file.filename || null, // store cloudinary ID if available
      }));

     if (
        replaceImageIndex !== undefined &&
        replaceImageIndex >= 0 &&
        replaceImageIndex < product.image.length
      ) {
        // Replace existing image
        const oldImage = product.image[replaceImageIndex];
        if (oldImage.public_id) {
          await cloudinary.uploader.destroy(oldImage.public_id);
        }
        product.image[replaceImageIndex] = newImages[0];
      } else {
        // Append new images
        product.image.push(...newImages);
      }
    }
    // Handle deleted images
    if (deletedImages) {
      const deletedIndices = Array.isArray(deletedImages)
        ? deletedImages
        : deletedImages.split(",").map(Number).filter(index => !isNaN(index));

      for (const index of deletedIndices) {
        if (index >= 0 && index < product.image.length) {
          const imageToDelete = product.image[index];
          // Delete from Cloudinary
          if (imageToDelete.public_id) {
            await cloudinary.uploader.destroy(imageToDelete.public_id);
          }
          // Remove from DB
          product.image.splice(index, 1);
        }
      }
    }

    await product.save();
    res.redirect("/admin/productList/?success=Product Updated Successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};

const removeProduct  = async (req, res) => {
    try {
        const productId = req.params.id;
        console.log("removeProduct", productId);
        
        
        const product = await Product.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: 'Not found' });

        product.isBlocked = !product.isBlocked; // toggle
        await product.save();

        res.status(200).json({ success: true, message: 'Product successfully deleted' });
    } catch (error) {
        console.error('Internal server error', error);
        res.status(500).json({ success: false });
    }
};


const filterProducts = async (req, res) =>{
  try {
  
         const {product = null, category = null, other} = req.query;
         

         const filter = {};
         if(product) filter.name = { $regex: product, $options: 'i' };
         if(category) filter.categoryId = category;
         

          //apply sort based on dropdown selections
          // if(priceOrder === 'asc') query = query.sort({ price: 1 });
          // if(priceOrder === 'desc') query = query.sort({ price: -1 });
 
          let query = {};
           switch(other){
            case 'desc':
                    query = { price: 1 };
                    break;
              case 'asc':
                      query = { price: -1 };
                      break;
                          
             case 'alphabetical-asc':
                               query = { name: -1 };
                               break;
             case 'alphabetical-desc':
                               query = { name: 1 };
                               break;
             case 'new-arrivals':
                                 query = { createdAt: 1 };
                                 break;
            default:
                    query = {};
                           
 }    

         let products = await Product.find(filter).sort(query).populate('categoryId');
                
                
                 res.status(200).json({success: true, data: products});

  } catch (error) {
       console.error('Error filtering products: ', error);
       res.status(500).json({success: false, message: 'Error filtering products'});
  }
};





module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
  getEditProduct,
  updateProduct,
  removeProduct,
  filterProducts
  
};
