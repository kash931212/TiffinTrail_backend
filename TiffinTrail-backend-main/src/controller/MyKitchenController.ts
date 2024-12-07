import express,{Request,Response} from 'express'
import client from '../conn';
import jwt from 'jsonwebtoken'
import cloudinary from 'cloudinary';



const getMyKitchen = async (req: Request, res: Response) => {
    try {
        const { authorization } = req.headers;

        if (!authorization || !authorization.startsWith("Bearer ")) {
            return res.sendStatus(401);
        }

        const token = authorization.split(" ")[1];
        const decoded = jwt.decode(token) as jwt.JwtPayload;
        const auth0Id = decoded.sub;
        const auth0IdString = auth0Id ? String(auth0Id) : 'default_value';

        const getKitchenQuery = `
            SELECT 
                k.owner_id,
                k.kitchen_name,
                k.city,
                k.country,
                k.delivery_price,
                k.delivery_time,
                k.cuisines,
                k.kitchenImage AS kitchen_image_url,
                k.lastUpdated,
                m.name AS menu_item_name,
                m.price AS menu_item_price
            FROM 
                kitchen k
            JOIN 
                menuItems m ON k.kitchen_name = m.kitchen_name
            WHERE 
                k.owner_id = $1;
        `;

        const getKitchenResult = await client.query(getKitchenQuery, [auth0IdString]);

        if (getKitchenResult.rows.length === 0) {
            return res.status(404).json({ message: "Kitchen not found" });
        }

        const kitchen = {
            owner_id: getKitchenResult.rows[0].owner_id,
            kitchen_name: getKitchenResult.rows[0].kitchen_name,
            city: getKitchenResult.rows[0].city,
            country: getKitchenResult.rows[0].country,
            delivery_price: getKitchenResult.rows[0].delivery_price,
            delivery_time: getKitchenResult.rows[0].delivery_time,
            cuisines: getKitchenResult.rows[0].cuisines,
            kitchenImage: getKitchenResult.rows[0].kitchen_image_url,
            lastUpdated: getKitchenResult.rows[0].lastUpdated,
            menuItems: getKitchenResult.rows.map((row: any) => ({
                name: row.menu_item_name,
                price: row.menu_item_price,
            })),
        };

        res.status(200).json(kitchen);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong" });
    }
};



interface MenuItem {
    name:string;
    price:number;
}

const createMyKitchen = async(req:Request,res:Response) => {
    const createKitchenTable = `
        CREATE TABLE IF NOT EXISTS kitchen(
            owner_id VARCHAR(255) REFERENCES users(auth0Id),
            kitchen_name VARCHAR(255) NOT NULL PRIMARY KEY,
            city VARCHAR(255) NOT NULL,
            country VARCHAR(255) NOT NULL,
            delivery_price NUMERIC NOT NULL,
            delivery_time NUMERIC NOT NULL,
            cuisines VARCHAR(255)[] NOT NULL,
            kitchenImage VARCHAR(255),
            lastUpdated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `
    client.query(createKitchenTable,(err,results)=>{
        if(err) throw err;
        console.log(results.rows);
    })

    const createMenuTable = `
        CREATE TABLE IF NOT EXISTS menuItems(
            item_id SERIAL PRIMARY KEY,
            kitchen_name VARCHAR(255) REFERENCES kitchen(kitchen_name),
            name VARCHAR(255) NOT NULL,
            price NUMERIC NOT NULL,
            lastUpdated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    `
    client.query(createMenuTable,(err,results)=>{
        if(err) throw err;
        console.log(results.rows);
    })
    
    try {
        const { kitchen_name, city, country,delivery_price , delivery_time,cuisines, menuItems } = req.body;
        const { authorization } = req.headers;

        if (!authorization || !authorization.startsWith("Bearer ")) {
            return res.sendStatus(401);
        }

        const token = authorization.split(" ")[1];
        const decoded = jwt.decode(token) as jwt.JwtPayload;
        const auth0Id = decoded.sub;
        const auth0IdString = auth0Id ? String(auth0Id) : 'default_value';

        const findUserQuery = 'SELECT * FROM kitchen WHERE kitchen_name = $1';
        const findUserResult = await client.query(findUserQuery, [kitchen_name]);

        if (findUserResult.rows.length > 0) {
            return res.status(409).json({ message: "User Kitchen already exists" });
        }

        const image = req.file as Express.Multer.File;
        const base64Image = Buffer.from(image.buffer).toString("base64");
        const dataURI = `data:${image.mimetype};base64,${base64Image}`;

        const uploadResponse = await cloudinary.v2.uploader.upload(dataURI);
        const kitchenImage = uploadResponse.url;

        const insertKitchenQuery = `
            INSERT INTO kitchen(owner_id, kitchen_name, city, country, delivery_price, delivery_time,cuisines,kitchenImage)
            VALUES ($1, $2, $3, $4, $5, $6,$7,$8)
            RETURNING kitchen_name;
        `;

        const insertKitchenResult = await client.query(insertKitchenQuery, [auth0IdString, kitchen_name, city, country, delivery_price, delivery_time,cuisines,kitchenImage]);
        const kitchenName = insertKitchenResult.rows[0].kitchen_name;

        const insertMenuItemsPromises = menuItems.map(async (menuItem: MenuItem) => {
            await client.query(`
                INSERT INTO menuItems (kitchen_name, name, price)
                VALUES ($1, $2, $3);
            `, [kitchenName, menuItem.name, menuItem.price]);
        });

        await Promise.all(insertMenuItemsPromises);

        res.status(201).json({ message: "Kitchen created successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong" });
    }
};





    




export default {
    createMyKitchen,
    getMyKitchen,
}