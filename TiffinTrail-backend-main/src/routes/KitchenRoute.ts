import express from 'express';
import { param } from 'express-validator'
import kitchenController from '../controller/kitchenController';

const router = express.Router();

router.get("/:owner_id" , param("kitchen_name").isString().trim().notEmpty().withMessage("Kitchen id parameter must be a valid string"),kitchenController.getKitchen);

router.get("/search/:city" , param("city").isString().trim().notEmpty().withMessage("City parameter must be a valid string"),kitchenController.searchKitchen);


export default router;