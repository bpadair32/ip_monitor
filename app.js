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

let transporter = nodemailer.createTransport({
    SES: new AWS.SES({
        apiVersion: '2010-12-01'
    })
});

function getDNS(site) {
  return new Promise((resolve, reject) => {
    dns.lookup(site, (err, address, family) => {
      if(err) {
        reject(err);
      }
      else {
        resolve(address);
      }
    });
  });
}

//STUB METHOD: notify
function notify() {
  transporter.sendMail({
    from: "no-reply@iqity.net",
    to: "brad.adair@iq-ity.com",
    subject: site + " IP address changed",
    text: "The IP address for " + site + " has changed. The old IP address was: " + oldIP + " and the new IP address is: " + newIP + ".",
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
getDNS(site).then((address) => {
  newIP = address;
  //If there was an IP loaded from file, compare them
  if(oldIP != "") {
    if(oldIP === newIP) {
      //they match, no need to go further
      console.log("IPs match");
      process.exit(0);
    }
    else {
      //They don't match, call notify function
      notify();
      //Then save the new IP
      saveIP(newIP);
    }
  }
  else {
    //If there was not, save IP
    saveIP(newIP);
  }
}).catch((err) => {
  console.log(err);
});
