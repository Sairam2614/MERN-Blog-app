const Post = require("../models/postModel")
const User = require("../models/userModel")
const path = require("path")
const fs = require("fs")
const {v4:uuid} = require("uuid")
const HttpError = require("../models/errorModel")



//  ============================CREATE POST
// POST : api/posts
// Protected

const createPost = async(req,res,next) =>{
    try {
        let {title,category,description} = req.body;
        if(!title || !category || !description || !req.files){
            return next(new HttpError("Fill in all the fields and choose thumbnail.",422))
        }
        const {thumbnail} = req.files;
        // check the file size
        if(thumbnail.size>2000000){
            return next(new HttpError("File too big. Should be less than 2mb"))
        }
        let filename = thumbnail.name
        let splittedfilename = filename.split(".")
        let newfilename = splittedfilename[0] + uuid() +'.' + splittedfilename[splittedfilename.length -1]
        thumbnail.mv(path.join(__dirname,'..','uploads', newfilename), async (err)=>{
            if(err){
                return next(new HttpError(err))
            }
            else {
                const newpost = await Post.create({title,category,description, thumbnail:newfilename, creator: req.user.id})
                if(!newpost){
                    return next(new HttpError("Post couldn't be created",422))
                }

                //find user and increase post count by 1
                const currentuser = await User.findById(req.user.id);
                const userPostcount = currentuser.posts + 1;
                await User.findByIdAndUpdate(req.user.id , {posts: userPostcount});
                res.status(201).json(newpost)
            }
        })


    } catch (error) {
        return next(new HttpError(error))
    }
}

//  ============================GET ALL POSTS
// POST : api/posts
// UnProtected

const getPosts = async(req,res,next) =>{
    try {
        const posts = await Post.find().sort({updatedAt:-1})
        res.status(200).json(posts)
        
    } catch (error) {
        return next(new HttpError(error))
    }
}

//  ============================GET SINGLE POST
// GET : api/posts/:id
// UnProtected

const getPost = async(req,res,next) =>{
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId);
        if(!post){
            return next(new HttpError("Post not found",404))
        }
        res.status(200).json(post)
        
    } catch (error) {
        return next(new HttpError(error))
    }
}

//  ============================GET POSTS BY CATEGORY
// GET : api/posts/categories/:category
// UnProtected

const getCatPosts = async(req,res,next) =>{
    try {
        const categoryName = req.params.category;
        const categoryPosts = await Post.find({category:categoryName}).sort({createdAt:-1})
        res.status(200).json(categoryPosts)
        
    } catch (error) {
        return next(new HttpError(error))
    }
}


//  ============================GET AUTHOR POSTS
// GET : api/posts/users/:id
// UnProtected

const getUserPosts = async(req,res,next) =>{
    try {
        const userId = req.params.id;
        const userPosts = await Post.find({creator:userId}).sort({createdAt:-1})
        res.status(200).json(userPosts)
    } catch (error) {
        return next(new HttpError(error))
    }
}

//  ============================EDIT POST
// PATCH : api/posts/:id
// Protected

const editPost = async(req,res,next) =>{
    try {

        let fileName;
        let newFilename;
        let updatedPost;
        const postId = req.params.id;
        let {title,category,description}  = req.body;
        //ReactQuill has a paragraph opening and closing tag with a break tag in between so there are 11 characters already there.
        if(!title || !category || description.length <12){
            return next(new HttpError("Fill in all fields",422))
        }
        if(!req.files){
            updatedPost = await Post.findByIdAndUpdate(postId, {title,category,description}, {new:true})
        }
        else{
            // get old post from database
            const oldPost = await Post.findById(postId);
            //delete old thumbnail from upload
            fs.unlink(path.join(__dirname ,'..', 'uploads', oldPost.thumbnail),  async (err) =>{
                if(err){
                    return next(new HttpError(err));
                }
            })
            // upload new thumbnail
            const {thumbnail} = req.files;
            //check file size
            if(thumbnail.size > 2000000){
                return next(new HttpError("Thumbnail too big. should be less than 2mb."))
            }
            fileName = thumbnail.name;
            let splittedfilename = fileName.split('.')
            newFilename = splittedfilename[0] + uuid() + '.' + splittedfilename[splittedfilename.length -1];
            thumbnail.mv(path.join(__dirname, '..', '/uploads', newFilename),async (err) =>{
                if(err){
                    return next(new HttpError(error))
                }
            })
            updatedPost = await Post.findByIdAndUpdate(postId, {title,category,description,thumbnail:newFilename},{new:true})
        }

        if(!updatedPost) {
            return next(new HttpError(err))
        }
        res.status(200).json(updatedPost)
        
    } catch (error) {
        console.log(error)
        return next(new HttpError(error));
    }
}

//  ============================DELETE POST
// DELETE : api/posts/:id
// Protected

const deletePost = async(req,res,next) =>{
    try {
        const postId = req.params.id;
        if(!postId){
            return next(new HttpError("Post not found",400))
        }
        const post = await Post.findById(postId);
        if (!post) {
            return next(new HttpError("Post not found", 404));
        }
        const fileName = post.thumbnail;

        if (fileName) {
            // Delete thumbnail from uploads folder
            fs.unlink(path.join(__dirname, '..', 'uploads', fileName), async (err) => {
                if (err) {
                    return next(new HttpError("Failed to delete thumbnail", 500));
                }

                // Delete post from database after thumbnail is deleted
                await Post.findByIdAndDelete(postId);

                // Find user and reduce post count by 1
                const currentUser = await User.findById(req.user.id);
                if (currentUser) {
                    const userPostCount = currentUser.posts - 1;
                    await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });
                }

                res.json({ message: `Post ${postId} deleted successfully` });
            });
        } else {
            // If no thumbnail, just delete the post
            await Post.findByIdAndDelete(postId);

            // Find user and reduce post count by 1
            const currentUser = await User.findById(req.user.id);
            if (currentUser) {
                const userPostCount = currentUser.posts - 1;
                await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });
            }

            res.json({ message: `Post ${postId} deleted successfully` });
        }
    } catch (error) {
        console.log(error)
        return next(new HttpError(error))
    }
}

module.exports = {createPost,getPost,getPosts,editPost,deletePost,getCatPosts,getUserPosts}