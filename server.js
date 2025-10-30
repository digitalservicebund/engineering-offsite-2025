const express = require("express");
const path = require("path");
const os = require("os");
const QRCode = require("qrcode");

const app = express();
const port = 3001;

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// Endpoint to get the QR code
app.get("/qr", (req, res) => {
  const networkInterfaces = os.networkInterfaces();
  let ipAddress;
  for (const interfaceName in networkInterfaces) {
    const networkInterface = networkInterfaces[interfaceName];
    for (const anInterface of networkInterface) {
      if (anInterface.family === "IPv4" && !anInterface.internal) {
        ipAddress = anInterface.address;
        break;
      }
    }
    if (ipAddress) {
      break;
    }
  }

  if (ipAddress) {
    const url = `http://${ipAddress}:${port}`;
    QRCode.toDataURL(url, (err, dataUrl) => {
      if (err) {
        res.status(500).send("Error generating QR code");
        return;
      }
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      const img = Buffer.from(base64Data, "base64");
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Content-Length": img.length,
      });
      res.end(img);
    });
  } else {
    res.status(500).send("Could not determine IP address");
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running at http://localhost:${port}`);
});
