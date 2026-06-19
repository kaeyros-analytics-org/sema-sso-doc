FROM nginx:alpine

COPY index.html /usr/share/nginx/html/
COPY style.css /usr/share/nginx/html/
COPY script.js /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
COPY i18n/ /usr/share/nginx/html/i18n/
COPY sections/ /usr/share/nginx/html/sections/

EXPOSE 80
