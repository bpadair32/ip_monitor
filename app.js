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
let transporter = nodemailer.createTransport({
    SES: new AWS.SES({
        apiVersion: '2010-12-01'
    })
});

function getCurrentIps(host) {
  return new Promise((resolve, reject) => {
    dns.resolve4(host, (err, addresses) => {
      if(err) {
        reject(err);
      }
      else {
        resolve(addresses);
      }
    });
  });
}

function getPrevIps() {
  return new Promise((resolve, reject) => {
    fs.access("ip.txt", (err) => {
      if(!err) {
        fs.readFile("ip.txt", "utf8", (err, data) => {
          if(err) {
            reject(err);
          }
          else {
            resolve(data);
          }
        });
      }
    });
  });
}

function compareIps(old, current) {
  let match = false;
  for(let i = 0; i < current.length; i++) {
    if(old.includes(current[i])) {
      match = true;
    }
    else {
      match = false;
    }
  }
  return match;
}

function saveIps(ips) {
  return new Promise((resolve, reject) => {
    fs.writeFile("ip.txt", ips, "utf8", (err) => {
      if(err) {
        reject(err);
      }
      else {
        resolve();
      }
    });
  });
}

function notify(old, current) {
  transporter.sendMail({
    from: "no-reply@iqity.net",
    to: "brad.adair@iq-ity.com, support@iq-ity.com",
    subject: site + " IP address change",
    text: "The IP address for " + site + " has changed. The old address(es) were " + old + ". The new address(es) are " + current + ".",
  }, (err, info) => {
    if(err) {
      console.log(err);
    }
  });
}

/* jshint ignore:start */
async function main() {
  let currentIps = await getCurrentIps(site);
  console.log("Current IPs", currentIps);
  let prevIps = await getPrevIps();
  prevIps = prevIps.split(",");
  console.log("Previous IPs", prevIps);
  if(compareIps(prevIps, currentIps)) {
    console.log("Match");
  }
  else {
    console.log("No match");
    saveIps(currentIps).catch((err) => {
      console.log(err);
    });
    notify(prevIps, currentIps);
  }
}
/* jshint ignore:end */

main().catch((err) => {
  console.log(err);
});
