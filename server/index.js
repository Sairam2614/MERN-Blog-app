const express = require('express')
const cors = require('cors')
const { connect } = require('mongoose')
require('dotenv').config()
const bodyparser = require('body-parser')
const upload = require('express-fileupload')
const userRoutes = require('./routes/userRoutes')
const postRoutes = require('./routes/postRoutes')
const {notFound , errorHandler} = require('./middleware/ErrorMiddleware')

const app = express();
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(upload());
app.use('/uploads',express.static(__dirname+"/uploads"))


// // support parsing of application/json type post data
// app.use(bodyparser.json());

// //support parsing of application/x-www-form-urlencoded post data
// app.use(bodyparser.urlencoded({ extended: true }));
app.use(cors({extended:true , origin: "http://localhost:3000"}))

app.use('/api/users', userRoutes)
app.use('/api/posts', postRoutes)
app.use(notFound)
app.use(errorHandler)

connect(process.env.MONGO_URI)
    .then(() => {
        console.log("Connected to Database");
        app.listen(process.env.PORT, () => {
            console.log(`Server running on port ${process.env.PORT}`);
        });
    }).catch(error => console.log(error));


