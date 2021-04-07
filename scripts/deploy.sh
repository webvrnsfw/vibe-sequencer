rm -rf dist
npm run build
pushd dist
git init
git add .
git commit -m 'deploy'
git remote add origin https://github.com/webvrnsfw/vibe-sequencer
git push -u origin --force master:gh-pages
popd
rm -rf dist
