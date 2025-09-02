import { createCA, createCert } from "mkcert";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const serverIpAddress: string =
  process.env.SERVER_IP_ADDRESS || "172.16.105.211";

console.log(serverIpAddress);

async function generateCerts() {
  const ca = await createCA({
    organization: "Hello CA",
    countryCode: "NP",
    state: "Bagmati",
    locality: "Kathmandu",
    validity: 365,
  });

  fs.writeFileSync("rootCA.pem", ca.cert); // ✅ required
  fs.writeFileSync("rootCA-key.pem", ca.key); // optional

  // Step 2: Create domain certificate
  const cert = await createCert({
    ca: { key: ca.key, cert: ca.cert },
    domains: ["localhost", "127.0.0.1", "172.16.100.249", "172.16.105.211"],
    validity: 365,
  });

  fs.writeFileSync("localhost-key.pem", cert.key);
  fs.writeFileSync("localhost-cert.pem", cert.cert);

  console.log("✅ All certificates written:");
  console.log("- rootCA.pem");
  console.log("- localhost-cert.pem");
  console.log("- localhost-key.pem");
}

generateCerts().catch(console.error);
