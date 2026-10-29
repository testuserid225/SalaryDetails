const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`[SalaryDetails Backend Server] running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error(`[Unhandled Rejection]: ${err.message}`);
    server.close(() => process.exit(1));
  });

  // Handle SIGTERM
  process.on('SIGTERM', () => {
    console.log('[SalaryDetails Server] SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('[SalaryDetails Server] Process terminated.');
    });
  });
}).catch((err) => {
  console.error('[SalaryDetails Server Startup Failed]:', err);
});
