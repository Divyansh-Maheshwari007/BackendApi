import { validationResult } from "express-validator";
import { User } from "../model/user.model.js";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();
export const createUser = async (request, response, next) => {
    try {
        const errors = validationResult(request);
        if (!errors.isEmpty())
            return response.status(400).json({ error: "Bad request", errorMessages: errors.array() });
        let { password, name, contact, email } = request.body;
        const saltKey = bcrypt.genSaltSync(12);
        password = bcrypt.hashSync(password, saltKey);
        let result = await User.create({ name, password, contact, email });
        await sendEmail(email,name);
        return response.status(201).json({ message: "user created", user: result });
    }
    catch (err) {
        console.log(err);
        return response.status(500).json({ error: "Internal Server Error" });
    }
}

export const verifyAccount = async(request,response,next)=>{
   try{ 
    let {email} = request.body;
    let result = await User.updateOne({email},{$set:{isVerified: true}});
    return response.status(200).json({message :"Account Verified Successfully"});
   }
   catch(err){
     return response.status(500).json({error: "Internal Server Error"});
   }
}

export const authenticateUser = async (request, response, next) => {
    try {
        let { email, password } = request.body;
        
        let user = await User.findOne({ email });
        
        if(!user.isVerified)
          return response.status(401).json({error: "Unauthorized user | Account is not verified"});  
        
        if (!user)
            return response.status(401).json({ error: "Unauthorized user | Email id not found" });
        
        let status = await bcrypt.compare(password, user.password);
        
        user.password = undefined;
        
        status && response.cookie("token",generateToken(user.email,user._id,user.contact));
        
        return status ? response.status(200).json({ message: "Sign in success",user }) : response.status(401).json({ error: "Unauthorized user | Invalid password" });
    }
    catch (err) {
        console.log(err);
        return response.status(500).json({ error: "Internal Server Error" });
    }
}

const sendEmail = (email,name) => {
    return new Promise((resolve,reject)=>{
        let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASSWORD
            }
        });
    
        let mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'Account Verification',
            html: `<h4>Dear ${name}</h4>
            <p>Thank you for registration. To verify account please click on below button</p>
            <form method="post" action="https://backendapi-13-zim5.onrender.com/user/verification">
              <input type="hidden" name="email" value="${email}"/>
              <button type="submit" style="background-color: blue; color:white; width:200px; border: none; border: 1px solid grey; border-radius:10px;">Verify</button>
            </form>
            <p>
               <h6>Thank you</h6>
               Backend Api Team.
            </p>
            `
        };
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                reject(error);
            } else {
              resolve();
            }
        });
    });
    
}
const generateToken = (email,userId,contact)=>{
    let payload = {email,userId,contact};
    return jwt.sign(payload,process.env.TOKEN_SECRET);
}






