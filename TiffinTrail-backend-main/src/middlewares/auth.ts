import { auth } from "express-oauth2-jwt-bearer";
import {NextFunction, Request as ExpressRequest,Response} from 'express'
import jwt from 'jsonwebtoken'
import client from "../conn";

export const jwtCheck = auth({
    audience: process.env.AUTH0_AUDIENCE,
    issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    tokenSigningAlg: 'RS256'
});



