const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'public', 'events');

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(html|js|css|json)$/i.test(name)) out.push(p);
  }
  return out;
}

const pageRe = /`(\/(?:login|signup|verify|chat|chats|favorites|settings|admin|my-shop|post-service|register-shop|forgot-password|edit-service|service|vendor|map-view|become-vendor|account|index)\.html[^`]*)`/g;

let changed = 0;
for (const file of walk(root)) {
  let c = fs.readFileSync(file, 'utf8');
  const orig = c;

  // Protect ZE.api("/...") and ZE.api(`/...`)
  c = c.replace(/ZE\.api\(\s*(["`])(\/[^"`]*?)\1/g, 'ZE.api($1___API___$2$1');

  c = c.split('href="/').join('href="/events/');
  c = c.split("href='/").join("href='/events/");
  c = c.split('src="/').join('src="/events/');
  c = c.split("src='/").join("src='/events/");
  c = c.split('url(/').join('url(/events/');
  c = c.split('location.href = "/').join('location.href = "/events/');
  c = c.split("location.href = '/").join("location.href = '/events/");
  c = c.split('location.replace("/")').join('location.replace("/events/")');
  c = c.split("location.replace('/')").join("location.replace('/events/')");
  c = c.split('href: "/"').join('href: "/events/"');
  c = c.split('href: "/').join('href: "/events/');

  c = c.replace(/location\.href\s*=\s*`\/(?!events\/)([^`]*)`/g, 'location.href = `/events/$1`');
  c = c.replace(/location\.replace\(\s*`\/(?!events\/)([^`]*)`\s*\)/g, 'location.replace(`/events/$1`)');
  c = c.replace(pageRe, '`/events$1`');

  c = c.split('___API___').join('');
  c = c.split('/events/events/').join('/events/');

  if (c !== orig) {
    fs.writeFileSync(file, c, 'utf8');
    changed += 1;
    console.log('updated', path.relative(root, file));
  }
}
console.log('files changed:', changed);
