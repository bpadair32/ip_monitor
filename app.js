//Setup globals
const fs = require('fs');
const dns = require('dns');
const site = process.env.site || "ecot.iqity.net";
const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
if(process.env.environment != "AWS") {
  const myCredentials = new AWS.SharedIniFileCredentials({profile: 'prod'});
  AWS.config.update({credentials: myCredentials});
}
let oldIP = "";
let newIP = "";
let match = 0;

let transporter = nodemailer.createTransport({
    SES: new AWS.SES({
        apiVersion: '2010-12-01'
    })
});

function getDNS(site) {
  return new Promise((resolve, reject) => {
    dns.resolve4(site, (err, addresses) => {
      if(err) {
        reject(err);
      }
      else {
        resolve(JSON.stringify(addresses));
      }
    });
  });
}

function notify(oldAddresses, newAddresses) {
  transporter.sendMail({
    from: "no-reply@iqity.net",
    to: "brad.adair@iq-ity.com",
    subject: site + " IP address changed",
    text: "The IP address for " + site + " has changed. The old IP address(es) were: " + oldAddresses + " and the new IP address(es) are: " + newAddresses + ".",
  });
}

function saveIP(ip) {
  fs.writeFile("ip.txt", ip, "utf8", (err) => {
    if(err) {
      console.log("Error writing to file, exiting");
      process.exit(1);
    }
    else {
      console.log("Wrote file successfully");
    }
  });
}


//Check if there is an IP file and load the ip from it if there is
fs.access("ip.txt", (err) => {
  if(err) {
    console.log("Error accessing file. Assuming new file needed");
  }

  else {
    fs.readFile("ip.txt", "utf8", (err, data) => {
      if(err) {
        console.log("File exists but cannot be read. Exiting");
        process.exit(1);
      }

      else {
        oldIP = data;
        console.log(oldIP);
      }
    });
  }
});
//Get the current IP address
getDNS(site).then((addresses) => {
  let currentAddresses = JSON.parse(addresses);
  let oldAddresses = [];
  if(oldIP != "") {
     oldAddresses = oldIP.split(",");
  }
  else {
     oldAddresses = [];
  }
  for(let i = 0; i < currentAddresses.length; i++) {
    if(currentAddresses[i] === oldAddresses[0] || currentAddresses[i] === oldAddresses[1]) {
      console.log("Address matches");
      match = 1;
    }
    else {
      match = 0;
    }
  }
  if(!match) {
    saveIP(currentAddresses);
    notify(oldAddresses, currentAddresses);
  }
}).catch((err) => {
  console.log(err);
});
