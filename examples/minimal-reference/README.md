# Minimal Reference Implementation

A simple, vanilla JavaScript reference implementation demonstrating how to use `@gaia-tools/iris-core` to render astrological charts.

## Setup

1. **Build iris-core:**
   ```bash
   cd /path/to/iris-core
   npm install
   npm run build
   ```

2. **Install dependencies:**
   This example uses ES modules. You'll need to serve it via a local server (not `file://`).

3. **Start a local server:**
   ```bash
   # Using Python
   python -m http.server 8080
   
   # Or using Node.js
   npx serve .
   
   # Or using PHP
   php -S localhost:8080
   ```

4. **Configure backend URL:**
   Update the `API_BASE_URL` constant in `app.js` to point to your backend API.

5. **Open in browser:**
   Navigate to `http://localhost:8080/examples/minimal-reference/`

## Requirements

- Backend API running (default: `http://localhost:8000/api`)
- Modern browser with ES module support
- iris-core built and available (adjust import path in `app.js` if needed)

## Notes

- This is a minimal reference implementation
- For production use, consider error handling, validation, and UX improvements
- The chart container is responsive but chart size is fixed at 800x800
- Adjust import paths in `app.js` based on your build setup

## Troubleshooting

- **Module not found errors:** Ensure iris-core is built and the import path in `app.js` is correct
- **CORS errors:** Make sure your backend allows requests from your frontend origin
- **Chart not rendering:** Check browser console for errors and verify backend is running

