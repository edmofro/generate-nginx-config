#! /usr/bin/env node

import fs from 'fs';
import program from 'commander';

program
  .option('--in [inputFilePath]', 'Specify input json file', './servers.json')
  .option('--out [outputFilePath]', 'Specify output config file', './servers.conf')
  .parse(process.argv);

const inputFilePath = program.in;
const outputFilePath = program.out;
try {
  const configObject = require(`${process.cwd()}/${inputFilePath}`);
  const { domain, subdomains, ssl } = configObject;
  // Start with a server on port 80 and redirecting to the SSL version of the requested URL
  let configString = `server {
  listen 80 default_server;
  listen [::]:80 default_server;
  return 301 https://$host$request_uri;
}`;

  // Add the subdomains with redirects to the appropriate port
  for (let i = 0; i < subdomains.length; i++) {
    const {
      name,
      port,
      mobileRedirectSubdomain,
      rootPath,
      timeout,
      includeCachingRules = true,
    } = subdomains[i];
    configString = `${configString}
server {

  listen       443 ssl;
  listen       [::]:443 ssl;
  server_name  ${name && name.length > 0 ? `${name}.` : ''}${domain};
  root         ${rootPath || '/usr/share/nginx/html'};${mobileRedirectSubdomain ? `
  set $mobile_rewrite do_not_perform;

  ## chi http_user_agent for mobile / smart phones ##
  if ($http_user_agent ~* "(android|bb\d+|meego).+mobile|android|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino") {
    set $mobile_rewrite perform;
  }

  if ($http_user_agent ~* "^(1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-)") {
    set $mobile_rewrite perform;
  }

  ## redirect to m.example.com ##
  if ($mobile_rewrite = perform) {
    return https://${mobileRedirectSubdomain}.${domain};
  }` : ''}

  ssl_certificate ${ssl.certificate};
  ssl_certificate_key ${ssl.key};
  # It is *strongly* recommended to generate unique DH parameters
  # Generate them with: openssl dhparam -out /etc/pki/nginx/dhparams.pem 2048
  #ssl_dhparam "/etc/pki/nginx/dhparams.pem";
  ssl_session_cache shared:SSL:1m;
  ssl_session_timeout  10m;
  ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
  ssl_ciphers HIGH:SEED:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!RSAPSK:!aDH:!aECDH:!EDH-DSS-DES-CBC3-SHA:!KRB5-DES-CBC3-SHA:!SRP;
  ssl_prefer_server_ciphers on;

  # Load configuration files for the default server block.
  include /etc/nginx/default.d/*.conf;
  ${includeCachingRules ? 'include /etc/nginx/h5bp/basic.conf;' : ''}

  location / ${ rootPath ? `{
    try_files '' /index.html =404;
  }` : `{
              proxy_pass http://localhost:${port};
              proxy_set_header Host $host;
              proxy_set_header X-Real-IP $remote_addr;
              proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
              proxy_connect_timeout ${timeout || 150};
              proxy_send_timeout ${timeout || 100};
              proxy_read_timeout ${timeout || 100};
              proxy_buffers 4 32k;
              client_max_body_size 8m;
              client_body_buffer_size 128k;
      }`}

  # redirect server error pages to the static page /40x.html
  #
  error_page 404 /404.html;
      location = /40x.html {
  }

  # redirect server error pages to the static page /50x.html
  #
  error_page 500 502 503 504 /50x.html;
      location = /50x.html {
  }

}`;
  }
  fs.writeFile(`${process.cwd()}/${outputFilePath}`, configString, {}, () => {
    console.log('Done. Be sure to include the contents of https://github.com/h5bp/server-configs-nginx/tree/master/h5bp are at /etc/nginx/h5bp');
  });
} catch (error) {
  console.error(error.message);
}
