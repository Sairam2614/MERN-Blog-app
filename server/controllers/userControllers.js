
const User = require('../models/userModel')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs')
const path = require('path')
const {v4:uuid} = require('uuid')
const HttpError = require('../models/errorModel')




// ===================== REGISTER USER ==========================
// POST : api/users/register
// Unprotected


const registerUser = async (req, res, next) => {
    try {
        const { name, email, password, password2 } = req.body;
        if (!name || !password || !email) {
            return next(new HttpError("Fill in all fields", 422));
        }
        const newEmail = email.toLowerCase();
        const emailExists = await User.findOne({ email: newEmail });
        if (emailExists) {
            return next(new HttpError("This email already exists", 422));
        }
        // Convert password to string if it's a number
        const passwordString = typeof password === 'number' ? password.toString() : password;
        if (passwordString.trim().length < 6) {
            return next(new HttpError("Password should be at least 6 characters", 422));
        }
        if (passwordString !== password2) {
            return next(new HttpError("Passwords do not match", 422));
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(passwordString, salt.toString());
        const newUser = await User.create({ name, email: newEmail, password: hashedPassword });
        res.status(201).json(newUser);
    } catch (error) {
        return next(new HttpError("User registration failed", 422));
    }
};


// ===================== LOGIN A REGISTERED USER ==========================
// POST : api/users/login
// Unprotected

const loginUser = async (req,res,next) =>{
    try {
        const {email,password} = req.body;
        if(!email || !password){
            return next(new HttpError("Fill in all fields.",422))
        } 
        const newEmail = email.toLowerCase();
        const user = await User.findOne({email:newEmail});
        if(!user){
            return next(new HttpError("Invalid credentials.",422))
        }
        const comparePassword = await bcrypt.compare(password,user.password);
        if(!comparePassword){
            return next(new HttpError("Invalid credentials.",422))
        }

        const {_id:id, name} = user;
        const token = jwt.sign({id,name}, process.env.JWT_SECRET, {expiresIn:"1d"})
        res.status(200).json({token,id,name});
    }   catch (error) {
            return next(new HttpError("User Login failed", 422));
        }
}

// ===================== USER PROFILE ==========================
// POST : api/users/:id
// protected

const getUser = async (req,res,next) =>{

    try {
        const {id} = req.params;
        const user = await User.findById(id).select("-password");
        if(!user){
            return(next(new HttpError("User not found",404)))
        }
        res.status(200).json(user);
        
    } catch (error) {
        return next(new HttpError("Getting user failed.", 422));
    }

    
}

// ===================== CHANGE USER AVATAR (PROFILE PICTURE) ==========================
// POST : api/users/change-avatar
// protected

const changeAvatar = async (req,res,next) =>{
    try {
        if(!req.files.avatar){
            return next(new HttpError("Please choose an image",422))
        }

        //find user from database
        const user = await User.findById(req.user.id);

        //delete old avatar if exists;
        if(user.avatar){
            fs.unlink(path.join(__dirname,'..','uploads', user.avatar),(err)=>{
                if(err){
                    return next(new HttpError(err))
                }
            })
        }

        const {avatar} = req.files
        //check file size
        if(avatar.size > 500000){
            return next(new HttpError("Profile picture is too big. Should be less than 500kb."),422)
        }

        let fileName;
        fileName = avatar.name;
        let splittedFileName = fileName.split('.')
        let newFilename = splittedFileName[0] + uuid() + '.' + splittedFileName[splittedFileName.length-1]
        avatar.mv(path.join(__dirname, '..', 'uploads', newFilename), async (err) =>{
            if(err){
                return next(new HttpError(err))
            }
            const updatedAvatar = await User.findByIdAndUpdate(req.user.id, {avatar: newFilename, new:true})
            if(!updatedAvatar){
                return next(new HttpError("Avatar couldn't be changed.", 422))
                
            }
            res.status(200).json(updatedAvatar);
        })

    } catch (error) {
        return next(new HttpError(error))
    }
}

// ===================== Edit User Details(from profile) ==========================
// POST : api/users/edit-user
// protected

const editUser = async (req,res,next) =>{
    try {
        const {name,email,currentPassword,  newPassword, NewconfirmNewPassword} = req.body;
        if(!name || !email || !currentPassword || !newPassword){
            return next(new HttpError("Fill in all fields.",422))
        }

        //get user from database
        const user = await User.findById(req.user.id);
        if (!user){
            return next(new HttpError("User not found",403))
        }

        // make sure new email doesn't already exist.
        const emailExist = await User.findOne({email});
        //we want to update other details except email

        if(emailExist && (emailExist._id != req.user.id)) {
            return next(new HttpError("This email already exists", 422))
        }

        //compare current password to db password
        const validateUserPassword = await bcrypt.compare(currentPassword,user.password);
        if(!validateUserPassword){
            return next(new HttpError("Invalid current password", 422))
        }

        //compare new passwords
        if(newPassword !== NewconfirmNewPassword){
            return next(new HttpError("New passwords do not match", 422))
        }

        //hash new password
        const salt = await bcrypt.genSalt(10);
        const Hash = await bcrypt.hash(newPassword, salt);

        // update user info in database
        const newinfo = await User.findByIdAndUpdate(req.user.id , {name, email, password:Hash}, {new:true})
        res.status(200).json(newinfo);


    } catch (error) {
        return next(new HttpError("Editing user failed.",422))
    }
}
// ===================== Get authors ==========================
// POST : api/users/authors
// Unprotected

const getAuthors = async (req,res,next) =>{
    try {
        const authors = await User.find().select('-password');
        res.json(authors)
    } catch (error) {
        return next(new HttpError(error))
    }
}

module.exports = {registerUser,loginUser,getUser,changeAvatar,editUser,getAuthors}
