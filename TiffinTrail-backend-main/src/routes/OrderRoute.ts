import express from 'express'
import { jwtCheck } from '../middlewares/auth';
import OrderController from '../controller/OrderController';

const router = express.Router()

router.post("/checkout/create-checkout-session" , jwtCheck , OrderController.createCheckoutSession);

router.post("/checkout/webhook" , OrderController.stripeWebhookHandler)

// router.get("/" , jwtCheck , OrderController.getMyOrders)

export default router;

