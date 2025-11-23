const fs = require('fs');
const path = require('path');
const canvas = require('canvas');

// Create a 40x40 canvas
const cvs = canvas.createCanvas(40, 40);
const ctx = cvs.getContext('2d');

// Fill with transparent background
ctx.fillStyle = 'rgba(0, 0, 0, 0)';
ctx.fillRect(0, 0, 40, 40);

// Draw red crewmate
ctx.fillStyle = '#dc3c3c';

// Body (circle)
ctx.beginPath();
ctx.arc(20, 25, 10, 0, Math.PI * 2);
ctx.fill();

// Head (smaller circle)
ctx.beginPath();
ctx.arc(20, 10, 7, 0, Math.PI * 2);
ctx.fill();

// Eyes
ctx.fillStyle = '#1e1e1e';
ctx.fillRect(17, 8, 2, 2);
ctx.fillRect(23, 8, 2, 2);

// Save to file
const buffer = cvs.toBuffer('image/png');
fs.writeFileSync(path.join(__dirname, 'public', 'among-us-red-static.png'), buffer);
console.log('PNG created successfully!');
