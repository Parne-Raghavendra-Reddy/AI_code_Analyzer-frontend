const express = require('express');
const path = require('path');
const app = express();

// Render sets the PORT dynamically, default to 3000 for local testing
const port = process.env.PORT || 3000;

// Serve all static files from the current directory
app.use(express.static(path.join(__dirname, '.')));

// For any other route, serve index.html (useful if you had routing via JS)
app.get('/*', function (req, res) {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Frontend is running as a Web Service on port ${port}`);
});
