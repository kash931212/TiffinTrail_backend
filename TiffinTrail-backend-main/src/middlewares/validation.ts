import { Request,Response,NextFunction } from "express";
import { body, validationResult } from "express-validator";

const handleValidationErrors = async(req:Request,res:Response,next:NextFunction) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()) {
        return res.status(400).json({errors:errors.array()})
    }
    next();
}

export const validateMyUserRequest = [
    body("name").isString().notEmpty().withMessage("Name must be a string"),
    body("address_line1").isString().notEmpty().withMessage("Address_line1 must be a string"),
    body("city").isString().notEmpty().withMessage("city Must be a string"),
    body("country").isString().notEmpty().withMessage("Country must be a string"),
    handleValidationErrors,

]


export const validateMyKitchenRequest = [
    body("kitchen_name").isString().notEmpty().withMessage("Name must be a string"),
    body("city").isString().notEmpty().withMessage("city Must be a string"),
    body("country").isString().notEmpty().withMessage("Country must be a string"),
    body("delivery_time").isString().notEmpty().withMessage("Delievery time must be number"),
    body("delivery_price").isFloat({min:0}).notEmpty().withMessage("Must be a Positive number"),
    body("delivery_time").isInt({min:0}).withMessage("Must be positive integer"),
    body("cuisines")
    .isArray()
    .withMessage("Cuisines must be an array")
    .not()
    .isEmpty()
    .withMessage("Cuisines array cannot be empty"),
    body("menuItem.*.name").notEmpty().withMessage("Menu item name is required"),
    body("menuItem.*.price").notEmpty().withMessage("Menu item price is required"),
    handleValidationErrors,

]