require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const compression = require('compression');
const helmet = require('helmet');

const app = express();

// Security headers (CSP disabled to allow CDN resources)
app.use(helmet({ contentSecurityPolicy: false }));

// gzip compression
app.use(compression());

// Request logger
app.use(morgan('dev'));

// Serve static files (assets, css, js, images)
app.use(express.static(path.join(__dirname), { index: false, maxAge: '1d' }));

// Clean URL middleware
app.use((req, res, next) => {
    if (!(req.method === 'GET' && req.accepts('html'))) return next();

    const cleanPath = req.path.replace(/^\//, '');
    const pagesDir = path.join(__dirname, 'pages');

    const candidates = [];

    if (!cleanPath) {
        candidates.push(path.join(pagesDir, 'index.html'));
    } else {
        candidates.push(path.join(pagesDir, `${cleanPath}.html`));          
        candidates.push(path.join(pagesDir, cleanPath, 'index.html'));        
    }

    const gaTrackingId = process.env.GA_TRACKING_ID;
    const gaScript = gaTrackingId
        ? `\n<!-- Google Analytics -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=${gaTrackingId}"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', '${gaTrackingId}');\n</script>\n`
        : '';

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            let html = fs.readFileSync(candidate, 'utf8');
            if (gaScript) html = html.replace(/<\/head>/i, gaScript + '</head>');
            return res.send(html);
        }
    }

    // SPA fallback → index.html
    const indexPath = path.join(pagesDir, 'index.html');
    if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf8');
        if (gaScript) html = html.replace(/<\/head>/i, gaScript + '</head>');
        return res.send(html);
    }

    next();
});

// 404
app.use((req, res) => res.status(404).send('404 Not Found'));

const port = process.env.PORT || 5500;
const host = process.env.HOST || '0.0.0.0';

app.listen(port, host, () => {
    console.log(`Server running → http://127.0.0.1:${port}`);
    console.log(`GA: ${process.env.GA_TRACKING_ID || 'not configured'}`);
});