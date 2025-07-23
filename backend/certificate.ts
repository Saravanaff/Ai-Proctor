import { createCA, createCert } from "mkcert";
import fs from "fs";

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
    domains: ["localhost", "127.0.0.1","192.168.55.44","192.168.55.168"],
    validity: 365,
  });

  // Save domain key and cert with the exact names your server uses
  fs.writeFileSync("localhost-key.pem", cert.key);      // ✅ private key
  fs.writeFileSync("localhost-cert.pem", cert.cert);    // ✅ domain certificate

  console.log("✅ All certificates written:");
  console.log("- rootCA.pem");
  console.log("- localhost-cert.pem");
  console.log("- localhost-key.pem");
}

generateCerts().catch(console.error);
