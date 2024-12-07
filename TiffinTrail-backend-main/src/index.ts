import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import myUserRoute from './routes/MyUserRoute'
import myKitchenRoute from './routes/MyKitchenRoute'
import cloudinary from 'cloudinary'
import kitchenRoute from './routes/KitchenRoute'
import bodyParser from 'body-parser'
import orderRoute from './routes/OrderRoute'


cloudinary.v2.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET,
})

const app = express();
const port = process.env.PORT;
app.use(bodyParser.urlencoded({extended:false}))
app.use(express.json());
app.use(cors());


app.use('/api/my/user' , myUserRoute)
app.use('/api/my/kitchen' , myKitchenRoute)
app.use("/api/kitchen", kitchenRoute)
app.use('/api/order' , orderRoute)



app.listen(port, ()=>{
    console.log(`http://localhost:${port}`);
});