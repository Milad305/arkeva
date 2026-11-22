
FROM nginx:stable-alpine AS runtime

COPY landing/nginx.conf /etc/nginx/conf.d/default.conf

COPY landing/index.html /usr/share/nginx/html/index.html
COPY landing/assets/ /usr/share/nginx/html/assets/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
