# 🎯 Multi-Page Bingo App

A modern, interactive multi-page bingo game that fetches data from multiple Google Sheets. Built with React, TypeScript, and Express.js.

## Features

- 📊 **Multiple Google Sheets Integration**: Each page connects to a different Google Sheet
- 🎮 **Interactive Gameplay**: Click to select/deselect bingo items on each page
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🔄 **Real-time Updates**: Refresh data from Google Sheets anytime
- 🎨 **Modern UI**: Beautiful gradient design with smooth animations
- 🧭 **Sidebar Navigation**: Easy switching between different bingo pages
- 📋 **Page Management**: Automatic detection of configured and unconfigured pages

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Google Cloud Platform account
- Google Sheets API enabled

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <your-repo-url>
cd bingo-app
npm install
```

### 2. Google Sheets API Setup

1. **Create a Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one

2. **Enable Google Sheets API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API" and enable it

3. **Create Service Account**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the service account details
   - Download the JSON key file

4. **Share Your Google Sheets**:
   - Open each Google Sheet you want to use
   - Click "Share" and add your service account email (found in the JSON file)
   - Give it "Viewer" permissions

### 3. Environment Configuration

1. **Copy the environment template**:
   ```bash
   cp env.example .env
   ```

2. **Update the `.env` file**:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=./credentials.json
   
   # Page 1 Configuration (Required)
   GOOGLE_SHEET_ID_PAGE1=your_google_sheet_id_for_page1
   SHEET_RANGE_PAGE1=Sheet1!A1:Z100
   
   # Page 2 Configuration (Optional)
   GOOGLE_SHEET_ID_PAGE2=your_google_sheet_id_for_page2
   SHEET_RANGE_PAGE2=Sheet1!A1:Z100
   
   # Page 3 Configuration (Optional)
   GOOGLE_SHEET_ID_PAGE3=your_google_sheet_id_for_page3
   SHEET_RANGE_PAGE3=Sheet1!A1:Z100
   
   PORT=4000
   ```

3. **Add your credentials**:
   - Place your downloaded service account JSON file in the project root
   - Rename it to `credentials.json` or update the path in `.env`

### 4. Google Sheet Format

Each Google Sheet should have:
- **First row**: Headers (column names)
- **Subsequent rows**: Bingo items (one item per row)
- **First column**: Will be used as the display text for each bingo item

Example:
```
| Bingo Item        | Category | Difficulty |
|-------------------|----------|------------|
| "Free Space"      | Special  | Easy       |
| "Drink Coffee"    | Action   | Easy       |
| "Take a Break"    | Action   | Medium     |
```

## Running the Application

### Development Mode

1. **Start the backend server**:
   ```bash
   npm run backend
   ```

2. **In a new terminal, start the frontend**:
   ```bash
   npm run dev
   ```

3. **Open your browser**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:4000

### Production Build

```bash
npm run build
npm run preview
```

## API Endpoints

- `GET /api/pages` - Get list of all available pages
- `GET /api/bingo/:pageId` - Fetch bingo data for a specific page
- `GET /api/bingo` - Legacy endpoint (redirects to page1)
- `GET /api/health` - Health check endpoint

## Page Configuration

The app supports up to 3 pages by default:

### Page 1 (Required)
- **Environment Variable**: `GOOGLE_SHEET_ID_PAGE1`
- **Default Range**: `SHEET_RANGE_PAGE1` (defaults to Sheet1!A1:Z100)
- **Title**: "Bingo Page 1"

### Page 2 (Optional)
- **Environment Variable**: `GOOGLE_SHEET_ID_PAGE2`
- **Default Range**: `SHEET_RANGE_PAGE2` (defaults to Sheet1!A1:Z100)
- **Title**: "Bingo Page 2"

### Page 3 (Optional)
- **Environment Variable**: `GOOGLE_SHEET_ID_PAGE3`
- **Default Range**: `SHEET_RANGE_PAGE3` (defaults to Sheet1!A1:Z100)
- **Title**: "Bingo Page 3"

## Project Structure

```
bingo-app/
├── backend/
│   └── server.ts          # Express server with multi-sheet support
├── src/
│   ├── components/
│   │   └── BingoPage.tsx  # Reusable bingo page component
│   ├── App.tsx           # Main React component with navigation
│   ├── App.css           # Styles for the multi-page app
│   └── main.tsx          # React entry point
├── .env                  # Environment variables (create from env.example)
├── credentials.json      # Google service account credentials
└── package.json          # Dependencies and scripts
```

## Customization

### Adding More Pages
To add more pages, modify the `BINGO_SHEETS` configuration in `backend/server.ts`:

```typescript
const BINGO_SHEETS = {
    'page1': { /* ... */ },
    'page2': { /* ... */ },
    'page3': { /* ... */ },
    'page4': {
        sheetId: process.env.GOOGLE_SHEET_ID_PAGE4,
        range: process.env.SHEET_RANGE_PAGE4 || 'Sheet1!A1:Z100',
        title: 'Bingo Page 4'
    }
};
```

### Styling
- Modify `src/App.css` to change the appearance
- The app uses CSS Grid for responsive layout
- Colors and gradients can be adjusted in the CSS variables

### Google Sheets Integration
- Update the `SHEET_RANGE` variables in `.env` to change which cells are read
- Modify the `fetchBingoData` function in `backend/server.ts` for custom data processing

### Adding Features
- Bingo win detection
- Multiple bingo cards per page
- Timer functionality
- Sound effects
- Local storage for game state
- Page-specific settings

## Troubleshooting

### Common Issues

1. **"Failed to fetch bingo data"**:
   - Check if the backend server is running
   - Verify your Google Sheets API credentials
   - Ensure the Google Sheet is shared with your service account

2. **"No data found in the spreadsheet"**:
   - Check the `SHEET_RANGE` in your `.env` file
   - Verify your Google Sheet has data in the specified range
   - Make sure the first row contains headers

3. **"No configuration found for page"**:
   - Ensure the page ID is configured in the backend
   - Check that the corresponding environment variable is set

4. **CORS errors**:
   - The backend is configured with CORS enabled
   - If issues persist, check the CORS configuration in `backend/server.ts`

### Debug Mode

To enable debug logging, add this to your `.env`:
```env
DEBUG=true
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

If you encounter any issues or have questions, please:
1. Check the troubleshooting section above
2. Review the Google Sheets API documentation
3. Open an issue in the repository
