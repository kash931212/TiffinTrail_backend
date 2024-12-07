import express from 'express'
import multer from 'multer';
import MyKitchenController from '../controller/MyKitchenController'
import { jwtCheck } from '../middlewares/auth';
import {validateMyKitchenRequest} from '../middlewares/validation'

const router = express.Router();


const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

router.get("/",jwtCheck,MyKitchenController.getMyKitchen);
router.post("/" , upload.single("imageFile") , jwtCheck , validateMyKitchenRequest,MyKitchenController.createMyKitchen)
// router.put("/" , jwtCheck , MyKitchenController.updateMyKitchen)

export default router;