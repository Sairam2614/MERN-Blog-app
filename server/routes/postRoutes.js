const {Router} = require('express')

const router = Router()

const {createPost,getPost,getPosts,editPost,deletePost,getCatPosts,getUserPosts} = require('../controllers/postControllers')
const authMiddleware = require('../middleware/authMiddleware')


router.post('/' , authMiddleware, createPost)
router.get('/' , getPosts)
router.get('/:id' , getPost)
router.get('/categories/:category' , getCatPosts)
router.get('/users/:id' , getUserPosts)
router.patch('/:id' , authMiddleware,editPost)
router.delete('/:id',authMiddleware, deletePost)

module.exports = router