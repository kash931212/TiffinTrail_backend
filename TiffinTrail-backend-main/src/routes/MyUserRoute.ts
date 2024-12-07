import express from 'express'
import MyUserController from '../controller/MyUserController'
import { jwtCheck,} from '../middlewares/auth'
import { validateMyUserRequest } from '../middlewares/validation'

const router = express.Router()

router.get("/", jwtCheck , MyUserController.getCurrentUser)
router.post('/' , jwtCheck , MyUserController.createCurrentUser)
router.put('/' , jwtCheck , validateMyUserRequest,  MyUserController.updateCurrentUser)


export default router