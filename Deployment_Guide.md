# Stock Manager - Deployment Guide

This application is designed to run securely on your **Local Network** (Wi-Fi/Ethernet).

## Option 1: Run on Main PC (Recommended)

This is the easiest and most secure method.

1.  **Start the Server**:
    *   On your Main PC, double-click `Start Stock Manager.bat` (or `Start Secure Server.bat`).
    *   Wait for the "Network" address to appear (e.g., `http://192.168.1.5:5173`).

2.  **Access from Other Devices**:
    *   On any other PC, Phone, or Tablet connected to the **SAME Wi-Fi**:
    *   Open a browser (Chrome, Safari, etc.).
    *   Type the "Network" address exactly as shown on the Main PC.
    *   **Done!** You can now use the app.

**Note:** The Main PC must stay ON for others to access the app.

---

## Option 2: Run on Multiple PCs

If you want to run the server *separately* on another PC (e.g., a laptop at home), you must:

1.  **Install Node.js**:
    *   Download and install Node.js from [nodejs.org](https://nodejs.org/).
    *   This is required to run the "engine" of the app.

2.  **Copy Files**:
    *   Copy the entire `stock_management_DM` folder to the new PC.

3.  **Install Dependencies**:
    *   Open the folder.
    *   Right-click inside -> "Open in Terminal".
    *   Run command: `npm install` (only needed once).

4.  **Run Server**:
    *   Double-click `Start Stock Manager.bat`.

---

## Troubleshooting

*   **"Site can't be reached"**:
    *   Ensure both devices are on the **same Wi-Fi**.
    *   Check if the Main PC's Firewall is blocking port `5173`. (Allow Node.js through Firewall).

*   **Login Issues**:
    *   Ensure you are using the correct email/password created by the Admin.
