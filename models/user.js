const mongoose = require('mongoose');
const products=require('./product')
const passportLocalMongoose = require('passport-local-mongoose');
const findOrCreate=require('mongoose-findorcreate');
const userSchema =mongoose.Schema({
    username:{
        type:String
    },
    googleid:{
        type:String
    },
    nombreCompleto:{
        type: String
    },
    photo:{
        type:String
    },
    image:{
      data:Buffer,
      contentType:String
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    telefono: {
        type: String,
        require: true
    },
    cart:[
        {
        item:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"products"
        },
        quantity:{
            type:Number,
            default:1
        }
    }],
    orders:[{
        type:mongoose.ObjectId,
        ref:"orders"
    }],
    role:{
        type:String,
        default:"Customer"
    },
    verificado:{
        type: Boolean,
        default: false
    },
    codeNuevo:{
        type: Number
    },
    codePass:{
        type: Number
    }
    // password:{
    //     type: String,
    //     require: true
    // }
})
userSchema.plugin(passportLocalMongoose);
// userSchema.plugin(findOrCreate);
const User= mongoose.model("users",userSchema)
module.exports=User;