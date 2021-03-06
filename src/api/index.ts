/* eslint-disable @typescript-eslint/no-unused-vars */
'use strict'

// Debug
import debug from 'debug'

// Security
import helmet from 'helmet'
import { mask as objectMask } from '../lib/objectUtils'

// Database and File Storage
import knex from '../lib/db'
//import aws from 'aws-sdk'
//import multer from 'multer'
//import multerS3 from 'multer-s3'

// Express and Express Related
import express from 'express'
import session from 'express-session'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import logger from '../lib/logger'

// Authentication / Passport
import bcrypt from 'bcrypt'
import passport from 'passport'
import passportLocal from 'passport-local'

// Services
import * as usersService from '../api/services/users'

// Routes
import usersRoutes from './routes/users'
import authRoutes from './routes/auth'
import listingsRoutes from './routes/listings'
import listingRoutes from './routes/listing'
import ordersRoutes from './routes/orders'
import ordersByConsumerRoutes from './routes/ordersByConsumer'
import ordersByProducerRoutes from './routes/ordersByProducer'
import ordersByListingRoutes from './routes/ordersByListing'
import filesRoutes from './routes/files'

// Type Definitions
import { User } from '../definitions'

const LocalStrategy = passportLocal.Strategy

debug.enable('*')

const log = logger()
const app: express.Express = express()

app.use(helmet())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(session({
    secret: 'secrect',
    name: 'SESSIONID',
    saveUninitialized: false,
    resave: false,
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}))
app.use(passport.initialize())
app.use(passport.session())

// Database Logging
knex.addListener('query-error', (obj) => {
    log.error(obj, 'Knex Event: query-error')
})

// Passport Strategies
passport.serializeUser<any, number>(async (user, done) => {
    console.log('serializeUser')
    done(null, user.id)
})

passport.deserializeUser<Record<string, any>, number>(async (id, done) => {
    const user = await usersService.getUser({ id })
    done(null, user)
})

passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            const hash: string = (await knex.select('password').from('users').where('username', username))[0].password
            const match: boolean = await bcrypt.compare(password, hash)
            if (match) {
                try {
                    const user: User = (await usersService.getUser({ username })).data
                    return done(null, user)
                } catch (error) {
                    return done(null, false)
                }
            } else {
                return done(null, false)
            }
        } catch (error) {
            return done(error)
        }
    })
)

app.use('/users', usersRoutes)
app.use('/auth', authRoutes)
app.use('/listings', listingsRoutes)
app.use('/listing', listingRoutes)
app.use('/orders', ordersRoutes)
app.use('/ordersByConsumer', ordersByConsumerRoutes)
app.use('/ordersByProducer', ordersByProducerRoutes)
app.use('/ordersByListing', ordersByListingRoutes)
app.use('/files', filesRoutes)

// catch 404
app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    log.error(`Error 404 on ${req.url}.`)
    res.status(404).send({ status: 404, error: 'Not found' })
})

// catch errors
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const status = err.status || 500
    const msg = err.error || err.message
    const reqBody = objectMask(req.body, [{ match: /password$/, set: '...' }])
    log.error(`Error ${status} (${msg}) on ${req.method} ${req.url} with payload: `, reqBody)
    res.status(status).json({ status, error: msg })
})

export default app
