#!/bin/bash

# 1. Inject dynamic build time into Service Worker
BUILD_TIME=$(date +'%Y%m%d%H%M%S')
if [ "$(uname)" = "Darwin" ]; then
  sed -i '' "s/BUILD_TIME_PLACEHOLDER/$BUILD_TIME/g" ./app/sw.js
else
  sed -i "s/BUILD_TIME_PLACEHOLDER/$BUILD_TIME/g" ./app/sw.js
fi

# 2. Copy all files and folders from app/ to the root directory
cp -r app/* .
rm -rf app

# 3. Generate dynamic, SEO-optimized sitemap.xml with alternate hreflang tags
BUILD_DATE=$(date -u +"%Y-%m-%d")
cat <<EOF > sitemap.xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://stitcher.feeshy.top/</loc>
    <xhtml:link 
                 rel="alternate"
                 hreflang="zh"
                 href="https://stitcher.feeshy.top/"/>
    <xhtml:link 
                 rel="alternate"
                 hreflang="en"
                 href="https://stitcher.feeshy.top/en"/>
    <xhtml:link 
                 rel="alternate"
                 hreflang="x-default"
                 href="https://stitcher.feeshy.top/"/>
    <lastmod>${BUILD_DATE}</lastmod>
  </url>
  <url>
    <loc>https://stitcher.feeshy.top/en</loc>
    <xhtml:link 
                 rel="alternate"
                 hreflang="zh"
                 href="https://stitcher.feeshy.top/"/>
    <xhtml:link 
                 rel="alternate"
                 hreflang="en"
                 href="https://stitcher.feeshy.top/en"/>
    <xhtml:link 
                 rel="alternate"
                 hreflang="x-default"
                 href="https://stitcher.feeshy.top/"/>
    <lastmod>${BUILD_DATE}</lastmod>
  </url>
</urlset>
EOF

# 4. Clean up files and directories not needed for production static serving
rm -rf src misc node_modules package.json package-lock.json tailwind.config.js
rm -rf .github .gitattributes .gitignore .vscode
rm -f README.md LICENSE

# 5. Build script self-destructs to prevent leak
rm -f build.sh
