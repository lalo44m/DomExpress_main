const express=require('express')
const router=express.Router();
const mongoose=require('mongoose')
const Product=require('../models/product')
const Users=require("../models/user")
const isLoggedIn = require('../middlewares/isLoggedIn');
const e = require('connect-flash');
const previousUrl = require('../middlewares/previousUrl')
const currentUrl=require("../middlewares/currentUrl")

const Swal = require('sweetalert2');
const Orders = require('../models/order');

const validarActivo= async(req,res,next)=>{
    const {id} = req.params;
    await Users.find(id, {verificado: false}, (error, result)=> {
      if (req.user.verificado == false) {
        req.logout();
      }
    })
  }

router.get("/user/cart",currentUrl,isLoggedIn, async (req, res) =>{
    try{
    const user= await  Users.findById(req.user._id).populate('cart.item')
    for(let i=0;i< user.cart.length;i++){
        if( user.cart[i].item===null)
        { 
            user.cart.splice(i,1)
            await user.save();
        }
    }
    const data=user.cart
    res.render("user/cart",{data})
}catch(e){res.status(404).render('error/error',{"status":"404"})}
    // res.send(data);
    
})
router.post("/user/cart/:prodId",previousUrl,isLoggedIn,async (req,res)=>{
    try{
    const {prodId}=req.params;
    const userData=await Users.findById(req.user._id);
    const product=await Product.findById(prodId);
    let flag=0;  let cartLimit=true;  
    for(user of userData.cart){
        
        if(prodId==user.item)
        {  
            user.quantity+=Number(req.body.quantity);
            if(user.quantity>5){
               
                cartLimit=false;
            }
            
            flag=1;
            break;
            
        }
    }
    
    if(flag!=1){
     
        obj={
            item:product,
            quantity:Number(req.body.quantity)
        }
        userData.cart.push(obj);
        await userData.save();
        res.redirect(`/user/cart/`)
    }
    else{
        if(cartLimit===false){
            req.flash('error' ,"No puede añadir más de 5 artículos..")
            res.redirect(`/products/${prodId}`)
        }
        else{
            await userData.save();
            res.redirect(`/user/cart/`)
        }
    }
    
}catch(e){
    res.status(404).render('error/error',{"status":"404"})
}
})
router.delete("/user/cart/:userId/:prodId",previousUrl,isLoggedIn,async (req,res)=>{
    try{
    const{userId,prodId} = req.params;
    const data=await Users.findById(userId);
    try{
  
        data.cart.splice(data.cart.findIndex((e)=>e.item==prodId),1);
        
        await data.save();
        req.flash("success","Artículo eliminado de su carrito");
        res.redirect("/user/cart");
     }
     catch(e){
         req.flash("error","Hubo un problema al borrar del carrito");
         res.redirect("/user/cart");
    }
    }
    catch(e){
        console.log(e);
        res.status(404).render('error/error',{"status":"404"})
    }
})
router.get("/user/orders",currentUrl,isLoggedIn, async (req, res) => {
    try{
    
    const data = await  Users.findById(req.user._id).populate("orders");
    await data.populate({path:'orders.orderList.item',model:Product}).execPopulate();
    const orders=data.orders;
    res.render("user/orders" ,{orders});
    // res.send(orders)
    }catch(e){
        console.log(e);
        res.status(404).render('error/error',{"status":"404"})
    }
    
  });
router.get("/user/citas",currentUrl,isLoggedIn, async (req, res) => {
    try{
        res.render("citas/agendarCita");
    }catch(e){
        console.log(e);
        res.status(404).render('error/error',{"status":"404"})
    }
    
  });

  router.get("/update/estado/:id", currentUrl, isLoggedIn, async(req, res) =>{
    try {
        const {id} = req.params;

        console.log(id);

        const update = await Orders.findByIdAndUpdate(id, {atendida: true});
        console.log(update);
        res.redirect('/admin/orders');
    } catch (e){
        console.log(e);
        res.status(404).render('error/error',{"status":"404"})
    }
  });

  router.get("/mapaSitio", async (req, res) => {
    try {
      res.render("utils/mapaSitio");
    } catch (e) {
      console.log(e);
      res.status(404).render("error/error", { status: "404" });
    }
  });

module.exports=router;