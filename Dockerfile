FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium ffmpeg fontconfig fonts-dejavu-core ca-certificates python3-fonttools python3-brotli \
    && rm -rf /var/lib/apt/lists/*
ENV CHROME_PATH=/usr/bin/chromium TZ=America/Sao_Paulo
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p assets/fonts && python3 -c "from fontTools.ttLib import TTFont; f=TTFont('node_modules/@fontsource/fredoka/files/fredoka-latin-700-normal.woff'); f.flavor=None; f.save('assets/fonts/Fredoka-Bold.ttf')"
CMD ["sh", "agendador.sh"]
