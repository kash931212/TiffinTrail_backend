import express,{Request,Response} from 'express'
import client from '../conn';


const getKitchen = async (req: Request, res: Response) => {
    try {
        const ownerId = req.params.owner_id;

        const selectQuery = `
        SELECT k.*, m.item_id, m.name AS menu_item_name, m.price AS menu_item_price
        FROM kitchen k
        LEFT JOIN menuItems m ON k.kitchen_name = m.kitchen_name
        WHERE k.owner_id = $1`;
    
        const params = [ownerId];

        const kitchenResult = await client.query(selectQuery, params);
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
        

        res.json(kitchen);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something Went Wrong" });
    }
}





const searchKitchen = async (req: Request, res: Response) => {
    try {
        const city = req.params.city;

        const searchQuery = (req.query.searchQuery as string) || "";
        const selectedCuisines = (req.query.selectedCuisines as string) || "";
        const sortOption = (req.query.sortOption as string || "lastUpdated");
        const page = parseInt(req.query.page as string) || 1;

        const checkQuery = `SELECT COUNT(*) FROM kitchen WHERE city ILIKE $1`;
        const result = await client.query(checkQuery, [`%${city}%`]);
        const total = parseInt(result.rows[0].count, 10);

        if (total === 0) {
            return res.status(404).json({
                data:[],
                pagination:{
                    total:0,
                    page:1,
                    pageSize:1,
                }
            });
        }

        const pageSize = 10;
        const offset = (page - 1) * pageSize;

        let selectQuery = `
            SELECT k.*, m.name AS menu_item_name, m.price AS menu_item_price
            FROM kitchen k
            LEFT JOIN menuItems m ON k.kitchen_name = m.kitchen_name
            WHERE k.city ILIKE $1`;

        let params = [`%${city}%`];

        if (selectedCuisines) {
            const cuisinesArray = selectedCuisines.split(",").map(cuisine => cuisine.trim());
            const cuisineParams = cuisinesArray.map((_, index) => `$${index + 2}`);
            selectQuery += ` AND k.cuisines IN (${cuisineParams.join(",")})`;
            params = params.concat(cuisinesArray);
        }

        if (searchQuery) {
            const searchParam = `%${searchQuery}%`;
            selectQuery += `
                AND (k.kitchen_name ILIKE $${params.length + 1}
                OR k.cuisines ILIKE $${params.length + 2}
                OR m.name ILIKE $${params.length + 3})`;
            params.push(searchParam, searchParam, searchParam);
        }

        selectQuery += ` ORDER BY ${sortOption} ASC LIMIT ${pageSize} OFFSET ${offset}`;

        const kitchensResult = await client.query(selectQuery, params);
        const kitchens = kitchensResult.rows;

        const kitchensWithMenuItems = kitchens.reduce((acc:any[], kitchen:any) => {
            const existingKitchen = acc.find(item => item.kitchen_name === kitchen.kitchen_name);
            if (existingKitchen) {
                existingKitchen.menuItems.push({
                    name: kitchen.menu_item_name,
                    price: kitchen.menu_item_price
                });
            } else {
                acc.push({
                    owner_id: kitchen.owner_id,
                    kitchen_name: kitchen.kitchen_name,
                    city: kitchen.city,
                    country: kitchen.country,
                    delivery_price: kitchen.delivery_price,
                    delivery_time: kitchen.delivery_time,
                    cuisines: kitchen.cuisines,
                    kitchenimage: kitchen.kitchenimage,
                    lastupdated: kitchen.lastupdated,
                    menuItems: [{
                        name: kitchen.menu_item_name,
                        price: kitchen.menu_item_price
                    }]
                });
            }
            return acc;
        }, []);

        const response = {
            data: kitchensWithMenuItems,
            pagination: {
                total,
                page,
                pages: Math.ceil(total / pageSize)
            }
        };

        res.json(response);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something Went Wrong" });
    }
}    








export default {
    searchKitchen,
    getKitchen
}