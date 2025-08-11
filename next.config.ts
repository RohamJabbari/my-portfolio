/** @type {import('next').NextConfig} */
const repo = 'my-portfolio'; // <-- change to your repo name
module.exports = {
    output: 'export',
    basePath: `/${repo}`,
    assetPrefix: `/${repo}/`,
    images: { unoptimized: true },
};