const fs = require('fs');
const f = process.argv[2];
const j = JSON.parse(fs.readFileSync(f));
const pages = j.query.pages;
for (const k in pages) {
  const em = pages[k].imageinfo[0].extmetadata;
  for (const field of ['ObjectName','Artist','Credit','Source','DateTimeOriginal','ImageDescription','Permission','LicenseShortName']) {
    if (em[field]) console.log(field, ':', em[field].value.replace(/<[^>]+>/g,' ').slice(0,400));
  }
}
