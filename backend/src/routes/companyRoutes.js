const express = require('express');
const router = express.Router();
const { auth, requireSuperuser } = require('../middleware/auth');
const {
  createCompany,
  listCompanies,
  getCompany,
  updateCompany,
  deleteCompany,
  assignUserToCompany
} = require('../controllers/companyController');

// All company routes require superuser role
router.post('/', auth, requireSuperuser, createCompany);
router.get('/', auth, requireSuperuser, listCompanies);
router.post('/assign-user', auth, requireSuperuser, assignUserToCompany); // Must be before /:id
router.get('/:id', auth, requireSuperuser, getCompany);
router.put('/:id', auth, requireSuperuser, updateCompany);
router.delete('/:id', auth, requireSuperuser, deleteCompany);

module.exports = router;
