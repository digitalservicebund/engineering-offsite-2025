import QRCode from "qrcode";
import { ipAddress } from "./ip";

const port = window.location.port;
const url = `http://${ipAddress}:${port}`;
const qrCodeElement = document.getElementById("qr-code") as HTMLImageElement;

if (qrCodeElement) {
  QRCode.toDataURL(url, (err: Error | null | undefined, dataUrl: string) => {
    if (err) {
      console.error("Error generating QR code", err);
      return;
    }
    qrCodeElement.src = dataUrl;
  });
}
