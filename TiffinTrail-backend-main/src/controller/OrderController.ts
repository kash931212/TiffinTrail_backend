import Stripe from 'stripe';
import { Request,Response } from 'express';
import jwt from 'jsonwebtoken'
import client from '../conn';

const STRIPE = new Stripe(process.env.STRIPE_API_KEY as string);

const FRONTEND_URL = process.env.FRONTEND_URL as string;

// const getMyOrders = async(req:Request , res:Response) => {
//     try {
//         const { authorization } = req.headers;

//         if (!authorization || !authorization.startsWith("Bearer ")) {
//             return res.sendStatus(401);
//         }

//         const token = authorization.split(" ")[1];
//         const decoded = jwt.decode(token) as jwt.JwtPayload;
//         const auth0Id = decoded.sub;
//         const auth0IdString = auth0Id ? String(auth0Id) : 'default_value';

//         const selectQuery = `
//         SELECT * FROM orders
//         WHERE user_id = $1
//         ORDER BY created_at DESC;
//     `;

//     const ordersResult = await client.query(selectQuery, [auth0IdString]);
//     const orders = ordersResult.rows;

//     res.json(orders);
//     }
//     catch(error) {
//         console.log(error);
//         res.status(500).json({message:"Something went wrong"})
//     }
// }

interface MenuItem {
    item_id:string;
    name:string;
    price:number;
}

type CheckoutSessionRequest = {
    cartItems:{
        item_id:string;
        name:string;
        quantity:string;
    }[];
    deliveryDetails: {
        email:string;
        name:string;
        addressLine1:string;
        city:string;
    };
    restaurantId:string;
};

const stripeWebhookHandler = async(req:Request , res:Response) => {
    console.log("RECEIVED EVENT");
    console.log("================");
    console.log("event:" , req.body);
    res.send();
}

const createCheckoutSession = async (req:Request,res:Response) => {
    try {
        const { authorization } = req.headers;

        if (!authorization || !authorization.startsWith("Bearer ")) {
            return res.sendStatus(401);
        }

        const token = authorization.split(" ")[1];
        const decoded = jwt.decode(token) as jwt.JwtPayload;
        const auth0Id = decoded.sub;
        const auth0IdString = auth0Id ? String(auth0Id) : 'default_value';

        const checkoutSessionRequest: CheckoutSessionRequest = req.body;

        const selectQuery = `
        SELECT k.*, m.item_id, m.name AS menu_item_name, m.price AS menu_item_price
        FROM kitchen k
        LEFT JOIN menuItems m ON k.kitchen_name = m.kitchen_name
        WHERE k.owner_id = $1`;
    

        const kitchenResult = await client.query(selectQuery, [checkoutSessionRequest.restaurantId]);
        const kitchens = kitchenResult.rows;

        if (kitchens.length === 0) {
            return res.status(404).json({ message: "Kitchen not found" });
        }

        const kitchen = {
            owner_id: kitchens[0].owner_id,
            kitchen_name: kitchens[0].kitchen_name,
            city: kitchens[0].city,
            country: kitchens[0].country,
            delivery_price: kitchens[0].delivery_price,
            delivery_time: kitchens[0].delivery_time,
            cuisines: kitchens[0].cuisines,
            kitchenimage: kitchens[0].kitchenimage,
            lastupdated: kitchens[0].lastupdated,
            menuItems: kitchens.map(k => ({ item_id: k.item_id, name: k.menu_item_name, price: k.menu_item_price }))
        };

        const createOrdersTableQuery = `
            CREATE TABLE IF NOT EXISTS orders (
                order_id SERIAL PRIMARY KEY,
                restaurant_id VARCHAR(255) REFERENCES kitchen(kitchen_name),
                user_id VARCHAR(255) REFERENCES users(auth0Id),
                delivery_details JSONB,
                cart_items JSONB NOT NULL,
                total_amount INTEGER,
                status VARCHAR(20) CHECK (status IN ('placed', 'paid', 'inProgress', 'outForDelivery', 'delivered')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        const insertOrderQuery = `
            INSERT INTO orders (restaurant_id, user_id, delivery_details, cart_items, total_amount, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING order_id;
        `;

        await client.query(createOrdersTableQuery);
        
        const deliveryAmountInRupees = parseInt((kitchen.delivery_price/100).toFixed(2))

        const insertOrderResult = await client.query(insertOrderQuery, [
            kitchen.kitchen_name,
            auth0IdString,
            JSON.stringify(checkoutSessionRequest.deliveryDetails),
            JSON.stringify(checkoutSessionRequest.cartItems),
            calculateTotalAmount(checkoutSessionRequest, kitchen.menuItems,deliveryAmountInRupees),
            'placed',
        ]);

        const orderId = insertOrderResult.rows[0].order_id;




        

        const lineItems = createLineItems(checkoutSessionRequest,kitchen.menuItems)

        const session = await createSession(lineItems,orderId.toString() , kitchen.delivery_price,kitchen.owner_id.toString());

        if(!session.url) {
            return res.status(500).json({message:"Error creating stripe Session"})
        }

        res.json({url:session.url})
    }
    catch(error:any) {
        console.log(error);
        res.status(500).json({message: error.raw.message})
    }
}

const createLineItems = (checkoutSessionRequest:CheckoutSessionRequest,menuItems:MenuItem[]) => {
    const lineItems = checkoutSessionRequest.cartItems.map((cartItem)=> {
        const menuItem = menuItems.find((item)=> item.item_id.toString() === cartItem.item_id.toString())

        if(!menuItem) {
            throw new Error(`Menu Item not found: ${cartItem.item_id}`);
        }

        const line_item:Stripe.Checkout.SessionCreateParams.LineItem = {
            price_data:{
                currency:"inr",
                unit_amount:menuItem.price,
                product_data:{
                    name:menuItem.name,
                }
            },
            quantity:parseInt(cartItem.quantity),
        }

        return line_item;
    })

    return lineItems
}

const createSession = async(lineItems:Stripe.Checkout.SessionCreateParams.LineItem[],order_id:string,delivery_price:number,owner_id:string) => {
    const sessionData = await STRIPE.checkout.sessions.create({
        line_items:lineItems,
        payment_method_types:["card"],
        shipping_options:[
            {
                shipping_rate_data:{
                    display_name:"Delivery",
                    type:"fixed_amount",
                    fixed_amount:{
                        amount:delivery_price,
                        currency:'inr',
                    }
                }
            }
        ],
        mode:"payment",
        metadata:{
            order_id:order_id.toString(),
            owner_id:owner_id.toString(),
        },

        success_url:`${FRONTEND_URL}/order-status?success=true`,
        cancel_url: `${FRONTEND_URL}/detail/${encodeURIComponent(owner_id)}?cancelled=true`

        

    })

    return sessionData;

}

const calculateTotalAmount = (checkoutSessionRequest: CheckoutSessionRequest, menuItems: MenuItem[],deliveryPrice: number) => {
    let totalAmount = 0;

    checkoutSessionRequest.cartItems.forEach(cartItem => {
        const menuItem = menuItems.find(item => item.item_id === cartItem.item_id);
        if (menuItem) {
            totalAmount += menuItem.price * parseInt(cartItem.quantity);
        }

        totalAmount += deliveryPrice*100
    });

    return totalAmount;
};


export default {
    createCheckoutSession,
    stripeWebhookHandler
}

