import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { iconGeometry, iconNames, iconScales } from '../dist/index.js';
import { AcmIcon } from '../src/react.js';
import { hasSocialBrandVariant, socialBrandAsset, createSocialBrandSvg } from '../src/social-brand.js';

test('every social symbol has brand artwork at all scales and old aliases resolve', () => {
  const names = iconNames.filter(name => name.startsWith('social.service.'));
  assert.equal(names.length, 44);
  for (const name of names) for (const scale of iconScales) {
    assert.equal(hasSocialBrandVariant(name), true, name);
    assert.ok(socialBrandAsset(name, scale).paths.length);
    assert.match(createSocialBrandSvg(name, scale, 32), /<path /);
    assert.match(renderToStaticMarkup(createElement(AcmIcon, { name, scale, variant: 'brand' })), /<path /);
  }
  assert.deepEqual(socialBrandAsset('brand.linkedin'), socialBrandAsset('social.service.linkedin'));
  assert.equal(hasSocialBrandVariant('action.undo'), false);
  assert.equal(hasSocialBrandVariant('toString'), false);
  assert.throws(() => socialBrandAsset('action.undo'));
  assert.throws(() => socialBrandAsset('social.service.google', 'bad'));
  assert.throws(() => createSocialBrandSvg('social.service.google', 'Regular-M', 0));
});

test('multicolour artwork is self-contained and React gradients do not share IDs', () => {
  assert.match(createSocialBrandSvg('social.service.amazon'), /#111111.*#FF9900/);
  assert.match(createSocialBrandSvg('social.service.youtube'), /#FF0000.*#FFFFFF/);
  assert.match(createSocialBrandSvg('social.service.linkedin'), /#FFFFFF.*#0D66C2/);
  const flickr = createSocialBrandSvg('social.service.flickr');
  assert.match(flickr, /#0063DC/); assert.match(flickr, /#FF0084/);
  const instagram = createSocialBrandSvg('social.service.instagram');
  assert.match(instagram, /linearGradient/); assert.match(instagram, /#FFFFFF/);
  const snapchat = createSocialBrandSvg('social.service.snapchat');
  assert.match(snapchat, /#FFFC00/); assert.match(snapchat, /#FFFFFF/);
  const tiktok = createSocialBrandSvg('social.service.tiktok');
  assert.match(tiktok, /#25F4EE/); assert.match(tiktok, /#FE2C55/);
  assert.match(tiktok, /translate\(1\.2 1\.2\) scale\(0\.9\)/);
  assert.match(tiktok, /translate\(-1\.5 0\)/); assert.match(tiktok, /translate\(1\.5 0\)/);
  assert.match(tiktok, /<title>TikTok social icon<\/title>/);
  assert.match(tiktok, /<desc>.*not an official asset\.<\/desc>/);
  const markup = renderToStaticMarkup(createElement('div', null, createElement(AcmIcon, {name:'social.service.instagram',variant:'brand'}), createElement(AcmIcon,{name:'social.service.instagram',variant:'brand'})));
  const ids = [...markup.matchAll(/linearGradient id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, 2); assert.notEqual(ids[0], ids[1]);
  assert.doesNotMatch(instagram, /<script|href=|onload=/i);
});

test('Mastodon uses its current official brand purple while the default remains monochrome', () => {
  const asset = socialBrandAsset('social.service.mastodon');
  assert.equal(asset.paths[0].fill, '#6364FF');
  assert.equal(iconGeometry['social.service.mastodon']['Regular-M'].paths[0].fill, 'currentColor');
});

test('Dropbox uses its current official brand blue', () => {
  assert.equal(socialBrandAsset('social.service.dropbox').paths[0].fill, '#0061FE');
});
