import { Router } from 'express';
import { getApiVersionPath } from '../config/apiVersions';
import v1Routes from './v1';

const router = Router();

// API versioned routes
// Mount each version at /api/{version}
router.use(getApiVersionPath('v1'), v1Routes);
// router.use(getApiVersionPath('v2'), v2Routes);

export default router;
