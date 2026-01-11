#!/usr/bin/env node

import { app } from '../dist/server.js';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  GET  /users');
  console.log('  POST /users');
  console.log('  DELETE /users/:id');
});