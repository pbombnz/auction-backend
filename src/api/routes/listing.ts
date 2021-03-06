import * as express from 'express'
import * as listing from '../services/listing'

import middleware from '../../lib/middleware'

const router = express.Router()

/**
 * Get all biddings related to auction-based listings
 */
router.get('/:id/biddings', async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
    try {
        const result = await listing.getListingBiddings(parseInt(req.params.id))
        res.status(result.status || 200).send(result.data)
    } catch (err) {
        next(err)
    }
})

/**
 * A user can place a bidding on listing.
 */
router.post('/:id/biddings', middleware.auth.isAuthenticated, async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> => {
    const listingId: number = req.params.id as unknown as number
    const userId: number = req.user ? req.user.id as unknown as number : -1
    try {
        const result = await listing.createListingBid(listingId, userId, req.body.bidAmount)
        res.status(result.status || 200).send(result.data)
    } catch (err) {
        next(err)
    }
})

export default router
