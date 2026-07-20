const express = require('express');
const router = express.Router();
const { auth, requireAgent } = require('../middleware/auth');
const {
  initCustomer,
  setCompany
} = require('../controllers/customerController');

// Public route to initialize customer session
router.post('/init', initCustomer);

// Protected route to manually set company for a customer (e.g. by an agent or superuser)
router.put('/set-company', auth, requireAgent, setCompany);

module.exports = router;
