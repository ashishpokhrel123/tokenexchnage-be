const express = require('express');
const cors = require('cors');
const  config  = require('./config/config');
const routes = require('./routes/index');
const ApiError = require('./utils/ApiError');
const { errorConverter } = require('./middleware/error');


const app = express();

function setupMiddleware() {
  app.use(express.json());
  app.use(cors());
  app.use(express.urlencoded({ extended: true }));
}

function setupRoutes() {
  app.use('/api/v1', routes);
}

function setupErrorHandling() {
  app.use((req, res, next) => {
    next(new ApiError(404, 'Not Found'));
  });

//   app.use(errorConverter);
//   app.use(errorConverter);
}

async function startServer() {
  try {
    // await connectDb();
    
    setupMiddleware();
    setupRoutes();
    setupErrorHandling();

    app.listen(config.port, () => {
      console.log(`Server is listening on http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;