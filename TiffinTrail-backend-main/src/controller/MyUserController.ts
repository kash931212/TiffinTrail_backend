import express,{Request,Response} from 'express'
import client from '../conn';
import jwt from 'jsonwebtoken'

const getCurrentUser = async (req: Request, res: Response) => {
    const { authorization } = req.headers;

    if (!authorization || !authorization.startsWith("Bearer ")) {
        return res.sendStatus(401);
    }

    const token = authorization.split(" ")[1];
    try {
        const decoded = jwt.decode(token) as jwt.JwtPayload;
        const auth0Id = decoded.sub;
        const auth0IdString = auth0Id ? String(auth0Id) : 'default_value';
        const findUser = `SELECT * FROM users WHERE auth0Id = $1`;
        client.query(findUser, [auth0IdString], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Something went wrong" });
            }
            if (results.rows.length === 0) {
                return res.status(404).json({ message: "User not found" });
            }
            const user = results.rows[0];
            return res.status(200).json(user);
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Something went wrong" });
    }
}


const createCurrentUser = async(req:Request , res:Response) => {
    
    const createTable = `
        CREATE TABLE IF NOT EXISTS users (
            auth0Id VARCHAR(255) PRIMARY KEY UNIQUE NOT NULL,
            email VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            address_line1 VARCHAR(255),
            city VARCHAR(255),
            country VARCHAR(255)
        );
    
    `
    client.query(createTable,(err,results)=>{
        if(err) throw err;
        console.log(results);
    })
    try {
        const {auth0Id,email} = req.body;
        const query = `
            SELECT * FROM users WHERE auth0Id = $1
        `
        client.query(query, [auth0Id], (err, results) => {
            if(err) throw err;
            if(results.rows.length) {
                return res.status(200).send("User already exists")
            }
        });
        
        const query2 = `
            INSERT INTO users (auth0Id,email) 
            VALUES ($1,$2)
        `
        const newUser = client.query(query2,[auth0Id,email],(err,results)=>{
            if(err) throw err;
            res.status(201).json(newUser);
        })
        

    }
    catch(error) {
        console.log(error);
        res.status(500).json({message:"Error Creating User"})

    }
}


const updateCurrentUser = async (req: Request, res: Response) => {
    const { authorization } = req.headers;

    if (!authorization || !authorization.startsWith("Bearer ")) {
        return res.sendStatus(401);
    }

    const token = authorization.split(" ")[1];

    try {
        const decoded = jwt.decode(token) as jwt.JwtPayload;
        const auth0Id = decoded.sub;
        const auth0IdString = auth0Id ? String(auth0Id) : 'default_value';
        const findUser = `SELECT * FROM users WHERE auth0Id = $1`;
        client.query(findUser, [auth0IdString], (err, results) => {
            if (err) throw err;
            if (results.rows.length === 0) {
                return res.status(404).json({ message: "User not found" });
            }

            const { name, address_line1, city, country } = req.body;
    
            const updateUser = `
                UPDATE users 
                SET name=$1, address_line1=$2, city=$3, country=$4
                WHERE auth0Id=$5
            `;
            client.query(updateUser, [name, address_line1, city, country, auth0Id], (err, results) => {
                if (err) throw err;
                res.status(200).json({ message: "User updated successfully" });
            });
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error updating user" });
    }
};




export default {
    createCurrentUser,
    updateCurrentUser,
    getCurrentUser
}