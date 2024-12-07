import {Client} from 'pg'
import 'dotenv/config'

const client = new Client({
    connectionString:process.env.POSTGRES_CONNECTION_STRING 
})

client.connect();


export default client;