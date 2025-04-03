
const express = require('express');
const tokenRouter = require('../routes/tokenRoute');


const router = express.Router();

const defaultRoutes = [
  {
    path: '/token',
    route: tokenRouter,
  },
  
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;